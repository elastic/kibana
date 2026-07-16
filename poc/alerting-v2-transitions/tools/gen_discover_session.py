#!/usr/bin/env python3
"""Generate a multi-tab Discover session (saved object type `search`, model v13)
that DEMONSTRATES the difference the PR #275654 fields make to the rule-details
activity-timeline (Gantt), pinned to a single flapping episode.

Usage:
  python3 gen_discover_session.py <rule_id> [episode_id]

Tabs:
  0. Pick an episode        -> per-episode flap counts, so you can choose an
                               `episode.id` that actually flapped.
  1. OLD (pre-PR)           -> `STATS MIN/MAX BY episode.status`. Collapses every
                               non-contiguous run of a status into ONE span, so a
                               flapping episode shows <= 4 rows and the active /
                               recovering spans OVERLAP in time (lossy).
  2. NEW (PR)               -> `... BY episode.status, episode.status_started_at`.
                               The contiguous-run discriminator keeps each run
                               separate: pending -> active -> recovering -> active
                               -> recovering -> ... -> inactive (lossless).
  3. NEW transitions (PR)   -> the explicit `transition.*` records: from -> to
                               plus the persisted `ends_duration_ms` per change.

Tabs 1-3 are filtered to a single `episode.id` when one is supplied.
Writes NDJSON suitable for `POST /api/saved_objects/_import`.
"""
import json
import sys

RULE_ID = sys.argv[1] if len(sys.argv) > 1 else "poc-flapping-spans"
EPISODE_ID = sys.argv[2] if len(sys.argv) > 2 else None

DS = ".rule-events"
BASE = f'FROM {DS} | WHERE type == "alert" AND rule.id == "{RULE_ID}"'
EP = f' AND episode.id == "{EPISODE_ID}"' if EPISODE_ID else ""

TABS = [
    (
        "0. Pick an episode (flap counts)",
        ["episode.id", "group_hash", "runs", "active_runs", "recovering_runs", "earliest", "latest"],
        f"{BASE} "
        "| STATS runs = COUNT_DISTINCT(episode.status_started_at), "
        'active_runs = COUNT_DISTINCT(CASE(episode.status == "active", episode.status_started_at, NULL)), '
        'recovering_runs = COUNT_DISTINCT(CASE(episode.status == "recovering", episode.status_started_at, NULL)), '
        "earliest = MIN(@timestamp), latest = MAX(@timestamp) BY episode.id, group_hash "
        "| SORT active_runs DESC, runs DESC | LIMIT 50",
    ),
    (
        "1. OLD (pre-PR): BY status -> collapses, spans overlap",
        ["episode.status", "seg_start", "seg_end", "duration_ms"],
        f"{BASE}{EP} "
        "| STATS seg_start = MIN(@timestamp), seg_end = MAX(@timestamp) BY episode.status "
        '| EVAL duration_ms = DATE_DIFF("millisecond", seg_start, seg_end) '
        "| KEEP episode.status, seg_start, seg_end, duration_ms | SORT seg_start ASC",
    ),
    (
        "2. NEW (PR): BY status + status_started_at -> true flapping",
        ["episode.status", "episode.status_started_at", "seg_start", "seg_end", "duration_ms"],
        f"{BASE}{EP} "
        "| STATS seg_start = MIN(@timestamp), seg_end = MAX(@timestamp) "
        "BY episode.status, episode.status_started_at "
        '| EVAL duration_ms = DATE_DIFF("millisecond", seg_start, seg_end) '
        "| KEEP episode.status, episode.status_started_at, seg_start, seg_end, duration_ms "
        "| SORT seg_start ASC",
    ),
    (
        "3. NEW (PR): explicit transitions (from -> to + duration)",
        [
            "@timestamp", "transition.from", "transition.to", "transition.ends_status",
            "transition.ends_started_at", "transition.ends_duration_ms", "transition.ends_status_count",
        ],
        f"{BASE}{EP} AND transition.to IS NOT NULL "
        "| KEEP @timestamp, transition.from, transition.to, transition.ends_status, "
        "transition.ends_started_at, transition.ends_duration_ms, transition.ends_status_count "
        "| SORT @timestamp ASC",
    ),
    (
        "4. NEW fields only (raw events)",
        [
            "@timestamp", "episode.id", "episode.status", "episode.status_started_at",
            "transition.from", "transition.to", "transition.ends_status",
            "transition.ends_started_at", "transition.ends_duration_ms", "transition.ends_status_count",
        ],
        f"{BASE}{EP} "
        "| KEEP @timestamp, episode.id, episode.status, episode.status_started_at, "
        "transition.from, transition.to, transition.ends_status, transition.ends_started_at, "
        "transition.ends_duration_ms, transition.ends_status_count "
        "| SORT @timestamp ASC | LIMIT 1000",
    ),
]


def make_tab(idx, label, columns, query):
    search_source = {"query": {"esql": query}, "filter": []}
    return {
        "id": f"tab-{idx}",
        "label": label,
        "attributes": {
            "columns": columns,
            "sort": [],
            "hideChart": True,
            "isTextBasedQuery": True,
            "usesAdHocDataView": False,
            "timeRestore": True,
            "timeRange": {"from": "now-24h", "to": "now"},
            "refreshInterval": {"pause": True, "value": 60000},
            "kibanaSavedObjectMeta": {"searchSourceJSON": json.dumps(search_source)},
        },
    }


pinned = f" (episode {EPISODE_ID})" if EPISODE_ID else ""
so = {
    "type": "search",
    "id": f"poc-gantt-{RULE_ID}",
    "attributes": {
        "title": f"POC transitions demo — {RULE_ID}",
        "description": (
            "OLD vs NEW rule-details Gantt for a single flapping episode of "
            f"'{RULE_ID}'{pinned}. Tab 1 (pre-PR) collapses the episode to <=4 "
            "overlapping status spans; tab 2 (PR: episode.status_started_at) shows "
            "the true active/recovering flapping; tab 3 shows the explicit "
            "transition.* records with persisted durations."
        ),
        "tabs": [make_tab(i, label, cols, q) for i, (label, cols, q) in enumerate(TABS)],
    },
    "references": [],
    "coreMigrationVersion": "8.8.0",
}

print(json.dumps(so))
