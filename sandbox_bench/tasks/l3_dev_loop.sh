#!/usr/bin/env bash
# L3 — the agent inner loop against one small, stable package (@kbn/std):
# unit tests, scoped type check, lint. This is what an agent iterating on a
# change pays per edit-verify cycle.

PKG="src/platform/packages/shared/kbn-std"

ensure_repo
ensure_toolchain
ensure_bootstrap

cd "$KIBANA_DIR"

bench_phase jest_start
node scripts/jest --config "$PKG/jest.config.js" || bench_fail jest_failed
bench_phase jest_done

bench_phase type_check_start
node scripts/type_check --project "$PKG/tsconfig.json" || bench_fail type_check_failed
bench_phase type_check_done

bench_phase lint_start
node scripts/eslint "$PKG/index.ts" || bench_fail lint_failed
bench_phase lint_done

bench_phase done
