#!/usr/bin/env bash
# L2 — toolchain (exact Node from .node-version + yarn 1.x) and
# `yarn kbn bootstrap` on a fresh clone.

ensure_repo
ensure_toolchain
ensure_bootstrap

bench_phase done
