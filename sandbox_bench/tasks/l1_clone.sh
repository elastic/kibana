#!/usr/bin/env bash
# L1 — clone elastic/kibana. Measures network egress + disk write throughput.

rm -rf "$KIBANA_DIR"

ensure_repo

[[ -f "$KIBANA_DIR/package.json" ]] || bench_fail package_json_missing
git -C "$KIBANA_DIR" rev-parse HEAD >/dev/null || bench_fail head_unresolvable

bench_phase done
