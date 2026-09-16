#!/usr/bin/env python3
"""Preflight coverage map for the golden cluster.

One command answering, per suite x era window: how many score docs, what %
carry traceId, and how many arg/usage spans join. Run BEFORE any board build
to pick the right suite/index/window and catch silent-zero joins up front.

Usage:
  golden_coverage.py [--suite X] [--since ISO] [--until ISO] [--env-file F]

Defaults mirror the agent_eval_full board build (suite=security-persona-matrix,
since=2026-09-01). Exit 0 always — this is a map, not a gate; the builder's
guards are the gate.
"""
import argparse
import json
import os
import sys
import urllib.request

SCORES_IDX = "/.ds-.evaluation-scores*/_search"
TRACES_IDX = "/.ds-traces-generic.otel-default*,.ds-traces-agent_builder.otel-default*/_search"


def load_env(path):
    env = {}
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if line.startswith("export "):
                line = line[7:]
            if "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


class Es:
    def __init__(self, url, key):
        self.url, self.key = url, key

    def post(self, path, body):
        req = urllib.request.Request(
            self.url + path, data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json", "Authorization": "ApiKey " + self.key})
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--env-file", default=os.path.expanduser("~/.elastic/golden-cluster-env.sh"))
    ap.add_argument("--suite", default="security-persona-matrix")
    ap.add_argument("--since", default="2026-09-01T00:00Z")
    ap.add_argument("--until", default=None)
    args = ap.parse_args()

    env = load_env(args.env_file)
    url, key = os.environ.get("GOLDEN_ES_URL") or env.get("GOLDEN_ES_URL"), \
               os.environ.get("GOLDEN_ES_API_KEY") or env.get("GOLDEN_ES_API_KEY")
    if not url or not key:
        sys.exit("GOLDEN_ES_URL / GOLDEN_ES_API_KEY missing")
    es = Es(url, key)

    rng = {"gte": args.since}
    if args.until:
        rng["lt"] = args.until

    # score docs + traceId coverage (sample 500)
    r = es.post(SCORES_IDX, {
        "size": 0,
        "query": {"bool": {"filter": [
            {"term": {"metadata.suite_id": args.suite}},
            {"range": {"@timestamp": rng}},
        ]}},
    })
    total = r["hits"]["total"]["value"]
    sample = es.post(SCORES_IDX, {
        "size": 500,
        "query": {"bool": {"filter": [
            {"term": {"metadata.suite_id": args.suite}},
            {"range": {"@timestamp": rng}},
        ]}},
        "_source": ["task.output.traceId", "task.model.id"],
        "sort": [{"@timestamp": "desc"}],
    })
    hits = sample["hits"]["hits"]
    n_tid = sum(1 for h in hits if ((h["_source"].get("task") or {}).get("output") or {}).get("traceId"))
    models = sorted({((h["_source"].get("task") or {}).get("model") or {}).get("id", "?") for h in hits})

    # usage + arg span counts in window (both trace indices)
    spans = es.post(TRACES_IDX, {
        "size": 0,
        "query": {"bool": {"filter": [
            {"range": {"@timestamp": rng}},
            {"bool": {"should": [
                {"exists": {"field": "attributes.gen_ai.usage.input_tokens"}},
                {"exists": {"field": "gen_ai.usage.input_tokens"}},
                {"exists": {"field": "attributes.gen_ai.tool.call.arguments"}},
            ]}},
        ]}},
        "aggs": {
            "usage": {"filter": {"bool": {"should": [
                {"exists": {"field": "attributes.gen_ai.usage.input_tokens"}},
                {"exists": {"field": "gen_ai.usage.input_tokens"}},
            ]}}},
            "args": {"filter": {"exists": {"field": "attributes.gen_ai.tool.call.arguments"}}},
        },
    })
    aggs = spans["aggregations"]
    n_usage, n_args = aggs["usage"]["doc_count"], aggs["args"]["doc_count"]

    # linkage: do sampled score traceIds find ANY span?
    tids = [((h["_source"].get("task") or {}).get("output") or {}).get("traceId") for h in hits[:50]]
    tids = [t for t in tids if t]
    linked = 0
    if tids:
        chk = es.post(TRACES_IDX, {
            "size": 0,
            "query": {"terms": {"trace_id": tids[:50]}},
            "aggs": {"n": {"cardinality": {"field": "trace_id"}}},
        })
        linked = chk["aggregations"]["n"]["value"]

    print(f"suite={args.suite} window={args.since}..{args.until or 'open'}")
    print(f"score docs: {total} | sampled {len(hits)}: {n_tid} carry traceId ({100*n_tid//max(len(hits),1)}%) | linked-of-50: {linked}/{len(tids)}")
    print(f"models in window (sampled): {len(models)} -> {', '.join(models[:8])}{' ...' if len(models) > 8 else ''}")
    print(f"spans in window: usage={n_usage} args={n_args}")
    print("verdict:", "JOIN LIKELY LIVE" if (tids and linked > 0 and n_usage > 0) else
          ("NO TRACE LINKAGE (era/indices) — expect zero-usage board, disclose" if n_usage > 0 else
           "NO USAGE SPANS IN WINDOW — expect zero-usage board, disclose"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
