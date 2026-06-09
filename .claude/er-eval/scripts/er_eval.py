#!/usr/bin/env python3
# ER eval harness: seed fixtures, run rule/embedding resolution, score per test case.

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from itertools import combinations

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stack as stack_mod
import embedding as emb
import llm

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_FIXTURES = os.path.join(BASE_DIR, "fixtures.json")


def log(msg=""):
    print(msg, flush=True)


# ---- fixtures ---------------------------------------------------------------

class Fixtures:
    def __init__(self, data):
        self.entities = data["entities"]
        self.clusters = data["clusters"]
        self.negatives = data.get("negatives", [])
        self.manual_links = data.get("manualLinks", [])
        self.incremental = data.get("incrementalBatches", {}).get("afterFirstRun", [])
        self._by_id = {e["entityId"]: e for e in self.entities}

    def entity(self, eid):
        return self._by_id.get(eid)

    def fields(self, eid):
        e = self._by_id.get(eid)
        return (e or {}).get("fields", {}) if e else {}

    def user_ids(self):
        return [e["entityId"] for e in self.entities if e.get("type") == "user"]

    def test_cases(self):
        def case_id(x):
            m = re.match(r"(#\d+)", x)
            return m.group(1) if m else x

        cases = {}
        for c in self.clusters:
            cases.setdefault(case_id(c["id"]), {"clusters": [], "negatives": []})["clusters"].append(c)
        for n in self.negatives:
            cases.setdefault(case_id(n["id"]), {"clusters": [], "negatives": []})["negatives"].append(n)

        out = []
        for cid, parts in cases.items():
            owners = {c.get("resolvableBy") for c in parts["clusters"] if c.get("resolvableBy") != "none"}
            owner = ("manual" if "manual" in owners else "rule" if "rule" in owners
                     else "embedding" if "embedding" in owners else "negative")
            challenges = set()
            for n in parts["negatives"]:
                challenges.update(n.get("challenges", []))
            out.append({"id": cid, "clusters": parts["clusters"], "negatives": parts["negatives"],
                        "owner": owner, "challenges": challenges})
        return sorted(out, key=lambda c: int(c["id"][1:]))

    def embedding_entity_ids(self):
        ids = set()
        for c in self.clusters:
            if c.get("resolvableBy") == "embedding":
                ids.update(c["members"])
        for n in self.negatives:
            if "embedding" in n.get("challenges", []):
                for a, b in n.get("pairs", []):
                    ids.add(a)
                    ids.add(b)
        return ids


def load_fixtures(path=None):
    with open(path or DEFAULT_FIXTURES, encoding="utf-8") as fh:
        return Fixtures(json.load(fh))


# ---- scoring ----------------------------------------------------------------

def pair(a, b):
    return tuple(sorted((a, b)))


def pairs_from_resolved_to(resolved_map):
    members = {}
    for eid, target in resolved_map.items():
        root = target if target else eid
        members.setdefault(root, set()).update({eid, root})
    pairs = set()
    for group in members.values():
        if len(group) > 1:
            for a, b in combinations(sorted(group), 2):
                pairs.add((a, b))
    return pairs


def per_test_case(fx, predicted_pairs, resolved_by=None, engines=None):
    resolved_by = resolved_by or {}
    results = []
    for case in fx.test_cases():
        pos_in_scope = bool(case["clusters"]) and (engines is None or case["owner"] in engines)
        neg_pairs = set()
        for n in case["negatives"]:
            neg_pairs |= {pair(a, b) for a, b in n.get("pairs", [])}
        neg_in_scope = bool(neg_pairs) and (engines is None or bool(case["challenges"] & engines))

        if not pos_in_scope and not neg_in_scope:
            results.append({"id": case["id"], "engine": None, "status": "na", "reasons": []})
            continue

        pos_total = pos_got = 0
        pos_ok = True
        if pos_in_scope:
            for c in case["clusters"]:
                want = set(combinations(sorted(c["members"]), 2))
                got = want & predicted_pairs
                pos_total += len(want)
                pos_got += len(got)
                if got != want:
                    pos_ok = False
        neg_viol = sorted(neg_pairs & predicted_pairs) if neg_in_scope else []

        engine = case["owner"] if case["owner"] != "negative" else None
        if neg_viol:
            culprit = None
            for a, b in neg_viol:
                culprit = resolved_by.get(a) or resolved_by.get(b)
                if culprit:
                    break
            engine = culprit or engine or "embedding"

        reasons = []
        if pos_in_scope and not pos_ok:
            reasons.append(f"missed {pos_total - pos_got}/{pos_total} links")
        if neg_viol:
            reasons.append(f"over-merged {len(neg_viol)} pair(s)")
        results.append({"id": case["id"], "engine": engine,
                        "status": "pass" if (pos_ok and not neg_viol) else "fail", "reasons": reasons})
    return results


def case_summary(case_results):
    scored = [r for r in case_results if r["status"] != "na"]
    return {
        "passed": sum(1 for r in scored if r["status"] == "pass"),
        "total": len(scored),
        "na": [r["id"] for r in case_results if r["status"] == "na"],
        "failures": [{"id": r["id"], "engine": r["engine"], "reasons": r["reasons"]}
                     for r in scored if r["status"] == "fail"],
    }


def confusion(fx, predicted_pairs, resolved_by=None, engine=None):
    resolved_by = resolved_by or {}
    tp = fn = tn = fp = 0
    for case in fx.test_cases():
        if case["clusters"] and case["owner"] != "manual" and (engine is None or case["owner"] == engine):
            want = set()
            for c in case["clusters"]:
                want |= set(combinations(sorted(c["members"]), 2))
            if (want & predicted_pairs) == want:
                tp += 1
            else:
                fn += 1
        neg_pairs = set()
        for n in case["negatives"]:
            neg_pairs |= {pair(a, b) for a, b in n.get("pairs", [])}
        if engine is not None and engine not in case["challenges"]:
            neg_pairs = set()
        if neg_pairs:
            viol = neg_pairs & predicted_pairs
            if not viol:
                tn += 1
            elif engine is None:
                fp += 1
            else:
                culprit = None
                for a, b in sorted(viol):
                    culprit = resolved_by.get(a) or resolved_by.get(b)
                    if culprit:
                        break
                fp += 1 if culprit == engine else 0
                tn += 0 if culprit == engine else 1
    p, n = tp + fn, tn + fp
    return {"TP": tp, "FN": fn, "TN": tn, "FP": fp, "P": p, "N": n,
            "TPR": round(tp / p, 4) if p else None, "FNR": round(fn / p, 4) if p else None,
            "TNR": round(tn / n, 4) if n else None, "FPR": round(fp / n, 4) if n else None}


# ---- report -----------------------------------------------------------------

def _rate(x):
    return f"{x:.2f}" if isinstance(x, (int, float)) else "  - "


def print_maintainer_report(report):
    log()
    log("=" * 72)
    log(f"MAINTAINER EVAL — engine={report['engine']}  fixtures={report['fixtures']}")
    log("=" * 72)
    tc = report["testCases"]
    log(f"  TEST CASES PASSED: {tc['passed']}/{tc['total']}"
        + (f"   (N/A: {','.join(tc['na'])})" if tc["na"] else ""))
    if tc["failures"]:
        log("  failures:")
        for f in tc["failures"]:
            log(f"    {f['id']:6} [{f['engine']}]  {'; '.join(f['reasons'])}")
    log()
    log("  CASE-LEVEL RATES:")
    log(f"    {'engine':10} {'TPR':>6} {'FNR':>6} {'TNR':>6} {'FPR':>6}")
    for eng in ("merged", "rule", "embedding", "manual"):
        m = report["confusion"].get(eng)
        if m:
            log(f"    {eng:10} {_rate(m['TPR']):>6} {_rate(m['FNR']):>6} {_rate(m['TNR']):>6} {_rate(m['FPR']):>6}")


def print_experiment_report(report):
    log()
    log("=" * 72)
    log(f"EXPERIMENT EVAL [{report.get('variant', 'knn')}] — "
        f"fixtures={report['fixtures']}  inferenceId={report['inferenceId']}")
    log("=" * 72)
    log("  (embedding test cases only; rule/manual fixtures excluded)")
    if report.get("llmGate"):
        log("  llm-gate: ON")
    log(f"  {'recipe':42} {'thr':>5} {'k':>3}  {'cases':>6}  {'TPR':>5} {'FNR':>5} {'TNR':>5} {'FPR':>5}")
    for row in report["results"]:
        c = row["confusion"]
        tc = row["testCases"]
        recipe = row["recipe"]
        recipe_s = (recipe[:40] + "..") if len(recipe) > 42 else recipe
        log(f"  {recipe_s:42} {row['threshold']:>5.2f} {row['k']:>3}  "
            f"{tc['passed']}/{tc['total']:<3}  "
            f"{_rate(c['TPR']):>5} {_rate(c['FNR']):>5} {_rate(c['TNR']):>5} {_rate(c['FPR']):>5}")
        llm = row.get("llm")
        if llm:
            log(f"      llm: {llm['calls']} calls, {llm['accepted']} accepted, {llm['rejected']} rejected"
                + (f"; rejected {llm['rejectedPairs']}" if llm.get("rejectedPairs") else ""))
    if report.get("unknownFields"):
        log(f"  ! recipe referenced unknown fields: {report['unknownFields']}")


def default_out_path(mode):
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return os.path.join(BASE_DIR, "output", f"{mode}-{stamp}.json")


def write_json(path, report):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, default=list)
    log(f"\n  report written to {path}")


# ---- maintainer mode --------------------------------------------------------

def wait_running(stack, attempts=60, delay=1.0):
    for _ in range(attempts):
        try:
            _, body = stack.status()
        except Exception:
            body = None
        if isinstance(body, dict) and (body.get("status") == "running"
                                       or (body.get("entity_store") or {}).get("status") == "running"):
            return True
        time.sleep(delay)
    return False


def run_maintainer(args):
    stack = stack_mod.Stack(args.kibana, args.es, args.auth)
    fx = load_fixtures(args.fixtures)
    engines = {"rule": [stack_mod.RULE_MAINTAINER], "embedding": [stack_mod.EMBEDDING_MAINTAINER],
               "both": [stack_mod.RULE_MAINTAINER, stack_mod.EMBEDDING_MAINTAINER]}[args.engine]

    log("[setup] enabling flag, installing entity store ...")
    stack.enable_v2_flag()
    stack.install()
    if not wait_running(stack):
        log("  ! entity store not running; continuing")
    stack.init_maintainers()

    if not args.no_seed:
        incremental = set(fx.incremental)
        initial = [e for e in fx.entities if e["entityId"] not in incremental]
        deferred = [e for e in fx.entities if e["entityId"] in incremental]
        log("[seed] round 1 ...")
        stack_mod.wipe(stack, log)
        stack_mod.seed_entities(stack, initial, log)
        stack_mod.reset_resolution(stack, [e["entityId"] for e in initial], log)
        stack_mod.post_manual_links(stack, fx.manual_links, log)
        log(f"[run] {engines} (round 1) ...")
        for mid in engines:
            stack.run_maintainer_sync(mid)
        if deferred:
            log("[seed] round 2 (incremental) ...")
            time.sleep(1)
            stack_mod.seed_entities(stack, deferred, log)
            log(f"[run] {engines} (round 2) ...")
            for mid in engines:
                stack.run_maintainer_sync(mid)
    else:
        log("[run] --no-seed: triggering over existing data ...")
        for mid in engines:
            stack.run_maintainer_sync(mid)

    log("[collect] reading provenance ...")
    prov = stack_mod.collect_provenance(stack)
    merged_map = {eid: (p.get("effective_to") or p.get("resolved_to")) for eid, p in prov.items()}
    resolved_by = {eid: (p.get("resolved_by") or "").lower() or None for eid, p in prov.items()}
    merged_pairs = pairs_from_resolved_to(merged_map)

    scope = set()
    if args.engine in ("rule", "both"):
        scope.add("rule")
    if args.engine in ("embedding", "both"):
        scope.add("embedding")
    case_results = per_test_case(fx, merged_pairs, resolved_by, engines=scope)

    conf = {"merged": confusion(fx, merged_pairs, resolved_by)}
    for eng in ("rule", "embedding"):
        if eng in scope:
            conf[eng] = confusion(fx, merged_pairs, resolved_by, engine=eng)

    report = {"mode": "maintainer", "engine": args.engine,
              "fixtures": os.path.basename(args.fixtures or DEFAULT_FIXTURES),
              "testCases": case_summary(case_results), "confusion": conf,
              "testCaseDetail": case_results}
    print_maintainer_report(report)
    write_json(args.out or default_out_path("maintainer"), report)
    return 0


# ---- experiment mode -------------------------------------------------------------

def _parse_recipes(embed_fields_args):
    recipes = []
    for raw in embed_fields_args:
        fields = [f.strip() for f in raw.split(",") if f.strip()]
        if fields:
            recipes.append(fields)
    return recipes


def _parse_thresholds(threshold, thresholds):
    if thresholds:
        lo, hi, step = (float(x) for x in thresholds.split(","))
        out, v = [], lo
        while v <= hi + 1e-9:
            out.append(round(v, 4))
            v += step
        return out
    return [threshold]


def _parse_groups(embed_group_args):
    groups = []
    for raw in embed_group_args:
        spec, weight = (raw.rsplit(":", 1) if ":" in raw else (raw, "1.0"))
        fields = [f.strip() for f in spec.split(",") if f.strip()]
        if fields:
            groups.append((fields, float(weight)))
    return groups


def _experiment_row(fx, predicted_pairs, resolved_by, recipe_label, thr, k, stats=None):
    case_results = per_test_case(fx, predicted_pairs, resolved_by, engines={"embedding"})
    summary = case_summary(case_results)
    summary.pop("na", None)
    row = {"recipe": recipe_label, "threshold": thr, "k": k, "testCases": summary,
           "confusion": confusion(fx, predicted_pairs, resolved_by, engine="embedding"),
           "testCaseDetail": [r for r in case_results if r["status"] != "na"]}
    if stats is not None:
        row["llm"] = stats
    return row


def run_experiment(args):
    stack = stack_mod.Stack(args.kibana, args.es, args.auth)
    fx = load_fixtures(args.fixtures)
    thresholds = _parse_thresholds(args.threshold, args.thresholds)
    embedding_ids = fx.embedding_entity_ids()
    groups = _parse_groups(args.embed_group)
    band = tuple(float(x) for x in args.llm_band.split(",")) if args.llm_band else None

    def new_gate():
        # fresh gate per row so stats are per-row
        if not args.llm_gate:
            return None, None
        return llm.make_gate(stack, args.llm_connector, fx, log, band=band)

    results = []
    all_unknown = set()
    try:
        if groups:
            # weighted multi-vector path (Experiment 1)
            group_strings, unknown = emb.build_group_strings(fx, groups, include_ids=embedding_ids)
            all_unknown.update(unknown)
            if unknown:
                log(f"[warn] groups reference unknown fields: {unknown}")
            log(f"[embed] {len(groups)} groups -> embedding-case entities ...")
            group_vectors = emb.embed_groups(stack, group_strings, args.inference_id)
            present = {e for gv in group_vectors for e in gv}
            types = {eid: (fx.entity(eid) or {}).get("type", "user") for eid in present}
            role_ids = {eid for eid in present if emb.is_role_account(fx.fields(eid))}
            dims = next(len(next(iter(gv.values()))) for gv in group_vectors if gv)
            field_names = emb.group_field_names(groups)
            emb.reset_vector_index_multi(stack, dims, field_names)
            emb.index_vectors_multi(stack, group_vectors, field_names, types)
            resolved_by = {eid: "embedding" for eid in present}
            weights = [w for _f, w in groups]
            label = "|".join(f"{n}:{w:g}" for n, (_f, w) in zip(field_names, groups))
            log(f"[knn] weighted linking ({field_names}) at thresholds={thresholds} k={args.k} ...")
            for thr in thresholds:
                accept, stats = new_gate()
                predicted = emb.cluster_via_weighted_knn(stack, group_vectors, field_names, weights,
                                                         role_ids, thr, args.k, accept=accept)
                results.append(_experiment_row(fx, predicted, resolved_by, label, thr, args.k, stats))
        else:
            # single-string path (unchanged baseline)
            recipes = _parse_recipes(args.embed_fields) or [["user.name", "user.full_name", "user.email"]]
            for recipe in recipes:
                strings, unknown = emb.build_identity_strings(fx, recipe, include_ids=embedding_ids)
                all_unknown.update(unknown)
                if unknown:
                    log(f"[warn] recipe {recipe} unknown fields: {unknown}")
                if not strings:
                    log(f"[warn] recipe {recipe} produced no embeddable entities; skipping")
                    continue
                log(f"[embed] recipe={recipe} -> {len(strings)} embedding-case entities ...")
                vectors = emb.embed_strings(stack, strings, args.inference_id)
                types = {eid: (fx.entity(eid) or {}).get("type", "user") for eid in vectors}
                role_ids = {eid for eid in vectors if emb.is_role_account(fx.fields(eid))}
                emb.reset_vector_index(stack, len(next(iter(vectors.values()))))
                emb.index_vectors(stack, vectors, types)
                resolved_by = {eid: "embedding" for eid in vectors}
                log(f"[knn] linking at thresholds={thresholds} k={args.k} ...")
                for thr in thresholds:
                    accept, stats = new_gate()
                    predicted = emb.cluster_via_knn(stack, vectors, role_ids, thr, args.k, accept=accept)
                    results.append(_experiment_row(fx, predicted, resolved_by, ",".join(recipe),
                                                   thr, args.k, stats))
    finally:
        try:
            stack.es_req("DELETE", f"/{emb.EXPERIMENT_INDEX}")
        except Exception:
            pass

    variant = "weighted-knn" if groups else "knn"
    if args.llm_gate:
        variant += "-llm-gate"
    report = {"mode": "experiment", "variant": variant,
              "fixtures": os.path.basename(args.fixtures or DEFAULT_FIXTURES),
              "inferenceId": args.inference_id, "llmGate": bool(args.llm_gate),
              "unknownFields": sorted(all_unknown), "results": results}
    print_experiment_report(report)
    write_json(args.out or default_out_path(variant), report)
    return 0


# ---- CLI --------------------------------------------------------------------

def build_parser():
    p = argparse.ArgumentParser(prog="er_eval", description="Entity-resolution evaluation harness")
    sub = p.add_subparsers(dest="mode", required=True)

    def common(sp):
        sp.add_argument("--kibana", default="http://localhost:5601")
        sp.add_argument("--es", default="http://localhost:9200")
        sp.add_argument("--auth", default="elastic:changeme")
        sp.add_argument("--fixtures", default=None)
        sp.add_argument("--out", default=None)

    m = sub.add_parser("maintainer")
    common(m)
    m.add_argument("--engine", choices=["rule", "embedding", "both"], default="both")
    m.add_argument("--no-seed", action="store_true")

    s = sub.add_parser("experiment")
    common(s)
    s.add_argument("--embed-fields", action="append", default=[])
    s.add_argument("--embed-group", action="append", default=[],
                   help='weighted multi-vector group "fields:weight" (repeatable)')
    s.add_argument("--threshold", type=float, default=0.85)
    s.add_argument("--thresholds", default=None)
    s.add_argument("--k", type=int, default=10)
    s.add_argument("--inference-id", default=stack_mod.DEFAULT_INFERENCE_ID)
    s.add_argument("--llm-gate", action="store_true", help="gate links through the LLM decision layer")
    s.add_argument("--llm-connector", default="openai-connector")
    s.add_argument("--llm-band", default=None, help='only consult LLM when LOW<=score<HIGH, e.g. "0.85,0.95"')
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    if args.mode == "maintainer":
        return run_maintainer(args)
    if args.mode == "experiment":
        return run_experiment(args)
    return 1


if __name__ == "__main__":
    sys.exit(main())
