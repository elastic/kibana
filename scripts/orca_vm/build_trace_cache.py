#!/usr/bin/env python3
"""Build a matrix trace cache directly from golden Elasticsearch.

Why this exists
---------------
The matrix generator normally fetches per-example score documents through the
evals plugin's example-scores route. On the golden cluster that route runs an
older plugin build that returns nothing for these queries, so every trace cell
renders hollow (no question, no steps, no tool trail) while the aggregated
scores still look perfect. `node scripts/evals ext matrix --trace-cache <path>`
takes a pre-pulled cache and skips the route entirely.

The cache is keyed exactly as query_matrix_traces.ts keys it:

    `${metadata.execution_id}::${example.id}` -> [score documents]

Usage
-----
    source /tmp/golden-cluster-env.sh
    python3 build_trace_cache.py --out /tmp/trace_cache.json
    node scripts/evals ext matrix --config ... --trace-cache /tmp/trace_cache.json
"""
from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
import urllib.request

DEFAULT_INDEX = ".evaluation-scores*"
# Only these carry the payload the trace renderer needs; pulling every evaluator
# for every example multiplies the cache size with no added trace detail.
PAGE_SIZE = 1000


def _client(url: str, api_key: str):
    # Elastic Cloud serves a properly-issued certificate; default verification
    # works and must stay on.
    ctx = ssl.create_default_context()

    def request(path: str, body: dict) -> dict:
        req = urllib.request.Request(
            url.rstrip("/") + path,
            data=json.dumps(body).encode(),
            headers={
                "Authorization": "ApiKey " + api_key,
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, context=ctx, timeout=180) as resp:
            return json.load(resp)

    return request


def fetch_all(request, index: str, experiment: str, hours: int) -> list[dict]:
    """Page through every score doc for the experiment using search_after."""
    docs: list[dict] = []
    search_after = None
    while True:
        body = {
            "size": PAGE_SIZE,
            # These documents are large (full step lists plus correctness and
            # groundedness analyses). Without source filtering a full pull moves
            # hundreds of MB and stalls; the renderer only reads these fields.
            # `example.metadata` and the analyses are excluded deliberately: a
            # 720h cache that includes them exceeds Node's max string length
            # (0x1fffffe8) and the CLI cannot readFileSync it at all.
            "_source": [
                "@timestamp",
                "example.id",
                "example.input.question",
                "task.output.steps",
                "task.output.messages",
                "task.model.id",
                "task.repetition_index",
                "evaluator.name",
                "evaluator.score",
                "evaluator.model.id",
                "metadata.execution_id",
            ],
            "query": {
                "bool": {
                    "filter": [
                        {"term": {"experiment_name": experiment}},
                        {"range": {"@timestamp": {"gte": f"now-{hours}h"}}},
                    ]
                }
            },
            # Tiebreak on _shard_doc-free sort: @timestamp alone is not unique.
            "sort": [{"@timestamp": "asc"}, {"_doc": "asc"}],
        }
        if search_after:
            body["search_after"] = search_after
        res = request(f"/{index}/_search", body)
        hits = res["hits"]["hits"]
        if not hits:
            break
        docs.extend(h["_source"] for h in hits)
        search_after = hits[-1]["sort"]
        print(f"  fetched {len(docs)}", flush=True)
        if len(hits) < PAGE_SIZE:
            break
    return docs


def build_cache(docs: list[dict]) -> dict[str, list[dict]]:
    cache: dict[str, list[dict]] = {}
    for doc in docs:
        execution_id = (doc.get("metadata") or {}).get("execution_id")
        example_id = (doc.get("example") or {}).get("id")
        if not execution_id or not example_id:
            continue
        cache.setdefault(f"{execution_id}::{example_id}", []).append(doc)
    return cache


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True)
    parser.add_argument("--experiment", default="security: security-persona-matrix")
    parser.add_argument("--index", default=DEFAULT_INDEX)
    parser.add_argument("--hours", type=int, default=720)
    args = parser.parse_args()

    url = os.environ.get("GOLDEN_ES_URL")
    api_key = os.environ.get("GOLDEN_ES_API_KEY")
    if not url or not api_key:
        print("GOLDEN_ES_URL / GOLDEN_ES_API_KEY must be set", file=sys.stderr)
        return 2

    request = _client(url, api_key)
    docs = fetch_all(request, args.index, args.experiment, args.hours)
    cache = build_cache(docs)

    # A cache whose entries carry no task.output is worse than no cache: it
    # silently satisfies the fetch and still renders hollow traces. Report the
    # ratio so the caller can tell a real cache from an empty one.
    with_steps = sum(
        1
        for entries in cache.values()
        for d in entries
        if ((d.get("task") or {}).get("output") or {}).get("steps")
    )
    models = {
        ((d.get("task") or {}).get("model") or {}).get("id")
        for entries in cache.values()
        for d in entries
    }

    with open(args.out, "w") as handle:
        json.dump(cache, handle)

    size = os.path.getsize(args.out)
    print(f"docs        : {len(docs)}")
    print(f"cache keys  : {len(cache)}")
    print(f"docs w/steps: {with_steps}")
    print(f"models      : {len(models - {None})}")
    print(f"written     : {args.out} ({size / 1e6:.0f} MB)")
    if with_steps == 0:
        print("ERROR: no document carries task.output.steps", file=sys.stderr)
        return 1
    # Node reads this file with readFileSync, which cannot produce a string
    # longer than 0x1fffffe8 (~536 MB). A larger cache aborts the matrix CLI
    # outright, so refuse it here where the cause is obvious.
    if size > 500_000_000:
        print(
            f"ERROR: cache is {size / 1e6:.0f} MB; Node cannot readFileSync "
            f"more than ~536 MB. Narrow --hours or the _source list.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
