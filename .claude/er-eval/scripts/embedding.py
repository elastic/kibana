# Offline embedding mirror of the embedding-resolution maintainer.

import json
import re
from itertools import combinations

INFERENCE_BATCH_SIZE = 16
DEFAULT_NUM_CANDIDATES = 100
EXPERIMENT_INDEX = "er-eval-experiment"

ROLE_ACCOUNT_LOCAL_PARTS = {
    "noreply", "no-reply", "admin", "helpdesk", "support", "info",
    "automation", "system", "root", "service",
}
ROLE_ACCOUNT_FULL_NAME_TOKENS = {"service", "bot", "pipeline", "monitor", "automation"}


def _field_value_to_str(value):
    if isinstance(value, list):
        return " ".join(str(v) for v in value)
    return str(value)


def label_for(key):
    # strip leading 'user.' so a user.* recipe matches the maintainer's labels
    return key[len("user."):] if key.startswith("user.") else key


def build_identity_string(fields, recipe):
    parts = []
    for key in recipe:
        if key not in fields:
            continue
        norm = _field_value_to_str(fields[key]).strip().lower()
        if norm:
            parts.append(f"{label_for(key)}: {norm}")
    return "; ".join(parts)


def build_identity_strings(fx, recipe, include_ids=None):
    ids = fx.user_ids()
    if include_ids is not None:
        ids = [e for e in ids if e in include_ids]
    strings = {}
    present = set()
    for eid in ids:
        f = fx.fields(eid)
        present.update(f.keys())
        s = build_identity_string(f, recipe)
        if s:
            strings[eid] = s
    return strings, [k for k in recipe if k not in present]


def is_role_account(fields):
    raw = fields.get("user.email")
    if isinstance(raw, list):
        raw = raw[0] if raw else ""
    email = str(raw or "").strip()
    if email:
        local = email.split("@", 1)[0].lower()
        tokens = [local] + [t for t in re.split(r"[.\-_]+", local) if t]
        if any(t in ROLE_ACCOUNT_LOCAL_PARTS for t in tokens):
            return True
    full = str(fields.get("user.full_name") or "").strip()
    return bool(full) and any(t in ROLE_ACCOUNT_FULL_NAME_TOKENS for t in full.lower().split())


def embed_strings(stack, strings, inference_id):
    eids = list(strings.keys())
    vectors = {}
    for i in range(0, len(eids), INFERENCE_BATCH_SIZE):
        batch = eids[i:i + INFERENCE_BATCH_SIZE]
        for eid, vec in zip(batch, stack.infer([strings[e] for e in batch], inference_id=inference_id)):
            vectors[eid] = vec
    return vectors


def reset_vector_index(stack, dims, index=EXPERIMENT_INDEX):
    try:
        stack.es_req("DELETE", f"/{index}")
    except Exception:
        pass
    mapping = {"mappings": {"properties": {"entity": {"properties": {
        "id": {"type": "keyword"},
        "EngineMetadata": {"properties": {"Type": {"type": "keyword"}}},
        "resolution": {"properties": {"embedding": {
            "type": "dense_vector", "dims": dims, "index": True, "similarity": "cosine"}}},
    }}}}}
    stack.es_req("PUT", f"/{index}", data=mapping)


def index_vectors(stack, vectors, types, index=EXPERIMENT_INDEX):
    lines = []
    for eid, vec in vectors.items():
        lines.append(json.dumps({"index": {"_index": index, "_id": eid}}))
        lines.append(json.dumps({"entity": {
            "id": eid, "EngineMetadata": {"Type": types.get(eid, "user")},
            "resolution": {"embedding": vec}}}))
    stack.es_req("POST", "/_bulk", data="\n".join(lines) + "\n", ndjson=True, query={"refresh": "wait_for"})


def knn_candidates(stack, query_vector, exclude_id, k, num_candidates, index=EXPERIMENT_INDEX):
    # ES cosine _score = (1 + cosine) / 2, same scale as the threshold
    body = {"size": k, "_source": ["entity.id"], "knn": {
        "field": "entity.resolution.embedding", "query_vector": query_vector,
        "k": k, "num_candidates": num_candidates,
        "filter": [{"term": {"entity.EngineMetadata.Type": "user"}},
                   {"bool": {"must_not": {"term": {"entity.id": exclude_id}}}}]}}
    _, resp = stack.search(index, body)
    out = []
    for hit in (resp.get("hits", {}).get("hits", []) if isinstance(resp, dict) else []):
        cid = (((hit.get("_source") or {}).get("entity")) or {}).get("id")
        if cid is not None and hit.get("_score") is not None:
            out.append((cid, hit["_score"]))
    return out


class _UnionFind:
    def __init__(self, items):
        self.parent = {x: x for x in items}

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[ra] = rb


def _pairs_from_uf(uf, eids):
    groups = {}
    for e in eids:
        groups.setdefault(uf.find(e), []).append(e)
    predicted_pairs = set()
    for members in groups.values():
        if len(members) > 1:
            for a, b in combinations(sorted(members), 2):
                predicted_pairs.add((a, b))
    return predicted_pairs


def cluster_via_knn(stack, vectors, role_ids, threshold, k, num_candidates=DEFAULT_NUM_CANDIDATES,
                    index=EXPERIMENT_INDEX, accept=None):
    # accept(a, b, score) -> bool: optional gate applied before linking (LLM layer)
    eids = sorted(vectors.keys())
    uf = _UnionFind(eids)
    for e in eids:
        if e in role_ids:
            continue
        cands = [(c, s) for (c, s) in knn_candidates(stack, vectors[e], e, k, num_candidates, index)
                 if c not in role_ids]
        if not cands:
            continue
        cands.sort(key=lambda cs: cs[1], reverse=True)
        top_id, top_score = cands[0]
        if top_score < threshold:
            continue
        if len(cands) >= 2 and cands[1][1] == top_score:
            continue  # ambiguity guard
        if accept is not None and not accept(e, top_id, top_score):
            continue
        uf.union(e, top_id)
    return _pairs_from_uf(uf, eids)


# ---- weighted multi-vector path (Experiment 1) ------------------------------

def build_group_strings(fx, groups, include_ids=None):
    # groups: list of (fields_list, weight). Returns (list of {eid: text}, unknown_fields)
    ids = fx.user_ids()
    if include_ids is not None:
        ids = [e for e in ids if e in include_ids]
    present = set()
    for eid in ids:
        present.update(fx.fields(eid).keys())
    group_strings = []
    for fields, _w in groups:
        s = {}
        for eid in ids:
            text = build_identity_string(fx.fields(eid), fields)
            if text:
                s[eid] = text
        group_strings.append(s)
    unknown = sorted({f for fields, _w in groups for f in fields if f not in present})
    return group_strings, unknown


def embed_groups(stack, group_strings, inference_id):
    return [embed_strings(stack, s, inference_id) for s in group_strings]


def group_field_name(fields):
    # readable field per group, e.g. ["user.name","user.full_name"]->"name_full_name"
    def one(f):
        return (f[len("user."):] if f.startswith("user.") else f).replace(".", "_")
    return "_".join(one(f) for f in fields)


def group_field_names(groups):
    names, seen = [], {}
    for fields, _w in groups:
        base = group_field_name(fields)
        seen[base] = seen.get(base, 0) + 1
        names.append(base if seen[base] == 1 else f"{base}_{seen[base]}")
    return names


def reset_vector_index_multi(stack, dims, field_names, index=EXPERIMENT_INDEX):
    try:
        stack.es_req("DELETE", f"/{index}")
    except Exception:
        pass
    emb_props = {name: {"type": "dense_vector", "dims": dims, "index": True,
                        "similarity": "cosine"} for name in field_names}
    mapping = {"mappings": {"properties": {"entity": {"properties": {
        "id": {"type": "keyword"},
        "EngineMetadata": {"properties": {"Type": {"type": "keyword"}}},
        "resolution": {"properties": emb_props},
    }}}}}
    stack.es_req("PUT", f"/{index}", data=mapping)


def index_vectors_multi(stack, group_vectors, field_names, types, index=EXPERIMENT_INDEX):
    eids = sorted({e for gv in group_vectors for e in gv})
    lines = []
    for eid in eids:
        emb = {field_names[i]: gv[eid] for i, gv in enumerate(group_vectors) if eid in gv}
        lines.append(json.dumps({"index": {"_index": index, "_id": eid}}))
        lines.append(json.dumps({"entity": {
            "id": eid, "EngineMetadata": {"Type": types.get(eid, "user")},
            "resolution": emb}}))
    stack.es_req("POST", "/_bulk", data="\n".join(lines) + "\n", ndjson=True, query={"refresh": "wait_for"})


def weighted_knn_candidates(stack, entity_groups, exclude_id, k, num_candidates,
                            index=EXPERIMENT_INDEX):
    # ES sums boost*(1+cos)/2 across the per-group clauses; normalize by Σweights
    knn = []
    wsum = 0.0
    for name, vec, w in entity_groups:
        knn.append({"field": f"entity.resolution.{name}", "query_vector": vec,
                    "k": k, "num_candidates": num_candidates, "boost": w,
                    "filter": [{"term": {"entity.EngineMetadata.Type": "user"}},
                               {"bool": {"must_not": {"term": {"entity.id": exclude_id}}}}]})
        wsum += w
    if not knn or wsum == 0:
        return []
    _, resp = stack.search(index, {"size": k, "_source": ["entity.id"], "knn": knn})
    out = []
    for hit in (resp.get("hits", {}).get("hits", []) if isinstance(resp, dict) else []):
        cid = (((hit.get("_source") or {}).get("entity")) or {}).get("id")
        if cid is not None and hit.get("_score") is not None:
            out.append((cid, hit["_score"] / wsum))
    return out


def cluster_via_weighted_knn(stack, group_vectors, field_names, weights, role_ids, threshold, k,
                             num_candidates=DEFAULT_NUM_CANDIDATES, index=EXPERIMENT_INDEX, accept=None):
    eids = sorted({e for gv in group_vectors for e in gv})
    uf = _UnionFind(eids)
    for e in eids:
        if e in role_ids:
            continue
        entity_groups = [(field_names[i], gv[e], weights[i])
                         for i, gv in enumerate(group_vectors) if e in gv]
        if not entity_groups:
            continue
        cands = [(c, s) for (c, s) in
                 weighted_knn_candidates(stack, entity_groups, e, k, num_candidates, index)
                 if c not in role_ids]
        if not cands:
            continue
        cands.sort(key=lambda cs: cs[1], reverse=True)
        top_id, top_score = cands[0]
        if top_score < threshold:
            continue
        if len(cands) >= 2 and cands[1][1] == top_score:
            continue
        if accept is not None and not accept(e, top_id, top_score):
            continue
        uf.union(e, top_id)
    return _pairs_from_uf(uf, eids)
