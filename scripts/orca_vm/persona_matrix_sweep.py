#!/usr/bin/env python3
"""
persona_matrix_sweep.py — Azure D8s_v5 sweep controller for the proprietary
model matrix (persona-matrix suite, 21 examples / 7 categories / 3 variants).

Design (validated 2026-08-19/20 across 15 models):
- 1 VM per model. `evals start` parallelizes internally; tokens dominate cost,
  so wider fanout only multiplies boot-failure surface.
- VM boot: image orca-eval-base-v5 (Node 24.19.0, Kibana, repo, deploy keys).
- Per-model run: /tmp/run_model.sh — minimal proven path:
    stop → clean ES data → `evals start --profile local` (owns scout+CCM+
    readiness) → export scores to golden (252-doc completeness gate).
- deploy() overlays two patched files onto the VM's Kibana checkout:
    1. evaluate_dataset.ts with the load_skill {"skill":"<id>"} SkillInvoked
       matcher (PR #286165, cherry-picked into the evals-ext-matrix worktree)
    2. evals_security_persona_matrix scout config with server.maxPayload=50MB
       (PR #286201) — judge /internal/inference/prompt payloads exceed the
       1.6MB default on long trajectories.
  Both run from source via the dev CLI, so no build step is needed on the VM.
- Judge: defaults to EVAL_CONNECTOR_ID=eis-anthropic-claude-4-6-sonnet for ALL
  models (comparability; self-judging bias exists in the docs matrix too).
  Export EVAL_CONNECTOR_ID to override it for judge-panel runs; it is forwarded
  to every VM. run_model.sh swaps to an alternate judge if the override would
  self-judge the candidate.

Usage:
  python3 persona_matrix_sweep.py --models all          # full re-sweep
  python3 persona_matrix_sweep.py --models "eis-a,eis-b"
  python3 persona_matrix_sweep.py --status
  python3 persona_matrix_sweep.py --teardown            # delete orca-sweep-* VMs
"""
import argparse
import inspect
import json
import sys
import os
import re
import shlex
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Mapping, Optional
from pathlib import Path

SSH_KEY = os.path.expanduser("~/.ssh/azure_eval_farm")
SSH_USER = "orcaeval"
IMAGE = json.load(open(Path(__file__).parent / ".azure-state.json"))["imageId"]
RG = "orca-eval-farm"
# Thinking-model sweeps (selfhost-qwen38 etc.) accumulate huge trace state in
# the Kibana dev server; D8s_v5 OOM-killed Kibana mid-run on all 3 shards
# (converse ECONNREFUSED after ~14 examples, 2026-09-05). Use D16s_v5 for
# selfhost models.
VM_SIZE = os.environ.get("SWEEP_VM_SIZE", "Standard_D8s_v5")

# ---------------------------------------------------------------------------
# Suite profiles.
#
# This sweeper began as persona-matrix-only and hardcoded that suite in ~35
# places. AD and automatic-migrations need the same VM fan-out but differ in
# suite id, source overlays, and completeness gate, so the per-suite facts live
# here instead of being threaded through every call site.
#
# `overlays` is a list of (local_path_relative_to_worktree, remote_path) pairs.
# The persona-matrix entries are the historical PATCHED_* constants; the other
# suites deliberately start EMPTY -- the base image carries their sources, and
# inventing overlays we have not proven necessary would ship untested patches
# to 27 VMs. Add one only when a canary run shows it is needed.
# ---------------------------------------------------------------------------
SUITE_PROFILES = {
    "security-persona-matrix": {
        "cli_suite": "security-persona-matrix",
        "gate_suite_id": "security-persona-matrix",
        "vm_prefix": "orca-sweep",
        # 21 prompts x 7 categories x 3 variants
        "n_examples": 21,
        "gate": "exact",
    },
    "attack-discovery-agent-builder": {
        "cli_suite": "attack-discovery-agent-builder",
        "gate_suite_id": "attack-discovery-agent-builder",
        "vm_prefix": "orca-ad",
        # 9 datasets x 1 example each, MEASURED from a completed canary run
        # (orca-ad-openai-gpt-5-4, 2026-09-02, "9 passed"): 117 score docs over
        # 9 datasets x 13 evaluators. Source-counting src/dataset.ts gives 5 and
        # misses the scenario-registry + clean-profile specs entirely -- two
        # separate wrong answers before the live run settled it.
        "n_examples": 9,
        # Uniform grid (every dataset runs all 13 evaluators), so the
        # examples x evaluators product is exact.
        "gate": "exact",
    },
    "security-automatic-migrations": {
        "cli_suite": "security-automatic-migrations",
        "gate_suite_id": "security-automatic-migrations",
        "vm_prefix": "orca-mig",
        # Each dataset carries a DIFFERENT evaluator count (measured on the
        # 2026-09-02 canary: standard-dashboards 7, qradar 9, splunk-spl 8),
        # so examples x evaluators is structurally wrong for this suite.
        # Gate on a floor measured from that canary run (86 docs) instead.
        "n_examples": None,
        "gate": "floor",
        "min_docs": 80,
    },
}

# Selected by --suite; mutated once in main() before any VM work.
SUITE = "security-persona-matrix"


def suite_profile(suite: Optional[str] = None) -> dict:
    name = suite or SUITE
    if name not in SUITE_PROFILES:
        raise KeyError(f"unknown suite {name!r}; known: {sorted(SUITE_PROFILES)}")
    return SUITE_PROFILES[name]


# Per-model env for run_model.sh. Slow reasoning models blow the default 30-min
# cap. Measured on golden (15 GLM runs, 2026-08-11..30): mean 341s per example,
# max 1198s. 21 examples therefore need ~119 min, so the old 60-min cap could
# never finish -- GLM has never exceeded 10/21 in three weeks of attempts.
# 180 min leaves headroom above the measured worst case without hiding a hang:
# a genuinely wedged run still dies on the per-request KBN_EVALS_HTTP_TIMEOUT_MS.
MODEL_ENV = {
    "eis-zai-glm-5-2": "PERSONA_MATRIX_TIMEOUT_MINUTES=180 PERSONA_MATRIX_CONCURRENCY=3",
    # GLM-5.3-flash via OpenRouter is the same slow class: measured ~4.8
    # min/example on a healthy run. A 3-example shard therefore needs ~15 min
    # of model work, but a shard that draws several slow examples plus retries
    # blew the 30-min suite default (run 8, "Test timeout of 1800000ms
    # exceeded" at attempt 2/3). 120 min per shard leaves headroom without
    # hiding a wedge: per-request KBN_EVALS_HTTP_TIMEOUT_MS still bounds a hang.
    "openrouter-zai-glm-5-3-flash": "PERSONA_MATRIX_TIMEOUT_MINUTES=120",
    "openrouter-deepseek-v4-pro": "PERSONA_MATRIX_TIMEOUT_MINUTES=120",
}
# Vars forwarded to every VM. EVAL_CONNECTOR_ID must stay here: run_model.sh only
# honours an override it actually receives, and otherwise re-derives its Anthropic
# default — a judge-panel sweep would then grade with the incumbent judge and still
# pass its doc-count gate.
FORWARDED_ENV_VARS = ("EVAL_REPETITIONS", "PERSONA_MATRIX_TIMEOUT_MINUTES", "EVAL_CONNECTOR_ID",
                      "KBN_EVALS_HTTP_RETRIES", "EVAL_SUITE", "PERSONA_MATRIX_SHARD",
                      "TEST_RUN_ID")
# Prefer the durable copy in ~/.elastic: /tmp is cleared by macOS and by
# routine cleanup, and a missing file here fails per-VM inside scp (every
# deploy dies, observed 2026-09-03) rather than once, up front.
GOLDEN_ENV_LOCAL = next(
    (p for p in (os.path.expanduser("~/.elastic/golden-cluster-env.sh"),
                 "/tmp/golden-cluster-env.sh") if os.path.isfile(p)),
    os.path.expanduser("~/.elastic/golden-cluster-env.sh"),
)
SWEEP_DIR = Path.home() / "persona-sweep"
KIBANA_MAIN = Path.home() / "Projects" / "kibana"

# Patched sources overlaid onto each VM before the run.
PATCHED_EVALUATOR = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/src/evaluate_dataset.ts"
)
PATCHED_EVALUATOR_REMOTE = (
    "Projects/kibana/x-pack/solutions/security/packages/"
    "kbn-evals-suite-security-persona-matrix/src/evaluate_dataset.ts"
)
# Per-example failure isolation (PR #285833): without it one example's
# converse/judge 500 rejects Promise.all(runJobs) and aborts the whole
# experiment — three determinism runs died this way mid-suite. Overlay the
# patched executor client (+ its TaskRun.error type) so errored examples are
# recorded and the remaining measurements survive.
PATCHED_EXECUTOR_CLIENT = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/platform/packages/shared/kbn-evals/src/kibana_evals_executor/client.ts"
)
PATCHED_EXECUTOR_TYPES = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/platform/packages/shared/kbn-evals/src/types.ts"
)
EXECUTOR_CLIENT_REMOTE = (
    "Projects/kibana/x-pack/platform/packages/shared/kbn-evals/src/"
    "kibana_evals_executor/client.ts"
)
EXECUTOR_TYPES_REMOTE = "Projects/kibana/x-pack/platform/packages/shared/kbn-evals/src/types.ts"
# Transport retries. The base image predates the fix, so without this overlay a
# dropped connection still ends the whole suite: glm-5-2 lost 19 of 21 examples
# twice this way, the second time on a re-run that was supposed to carry the fix.
PATCHED_HTTP_HANDLER = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/platform/packages/shared/kbn-evals/src/utils/http_handler_from_kbn_client.ts"
)
HTTP_HANDLER_REMOTE = (
    "Projects/kibana/x-pack/platform/packages/shared/kbn-evals/src/utils/"
    "http_handler_from_kbn_client.ts"
)
# Retry policy. The persona-matrix converse call goes through chat_client's
# withRetry (retry_utils), NOT the http handler above -- patching only the
# handler leaves the live path untouched and the run still dies on the first
# EIS 500. Deploy both or the fix is a no-op on the VM.
# chat_client itself must also ship: main's version has no withRetry wrapper
# (kbn-client retries=0 -> 'attempt=1/0' instant death) and no final-answer
# fallback for terse models. Without it the run is one transient away from
# a deterministic 14/42 shard failure.
PATCHED_CHAT_CLIENT = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/src/chat_client.ts"
)
CHAT_CLIENT_REMOTE = (
    "Projects/kibana/x-pack/solutions/security/packages/"
    "kbn-evals-suite-security-persona-matrix/src/chat_client.ts"
)
PATCHED_RETRY_UTILS = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/platform/packages/shared/kbn-evals/src/utils/retry_utils.ts"
)
RETRY_UTILS_REMOTE = (
    "Projects/kibana/x-pack/platform/packages/shared/kbn-evals/src/utils/retry_utils.ts"
)
# Dataset. The base image predates the entity_risk_score contract fix, so its
# pre-flight tool-availability check fails the whole suite before a single
# example runs (security.entity_risk_score is force-disabled under the skills
# flag this suite always enables).
PATCHED_DATASET = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/"
    "src/datasets/persona_matrix_prompts.ts"
)
DATASET_REMOTE = (
    "Projects/kibana/x-pack/solutions/security/packages/"
    "kbn-evals-suite-security-persona-matrix/src/datasets/persona_matrix_prompts.ts"
)
# evaluate_dataset.ts imports ./datasets/select_shard. The overlay copies an
# explicit file list, so a new module must be added here or the VM runs old
# code and dies at require time ("Cannot find module './datasets/select_shard'"
# -> "No tests found" -> 3 failed attempts, observed 2026-09-03).
PATCHED_SHARD = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/"
    "src/datasets/select_shard.ts"
)
SHARD_REMOTE = (
    "Projects/kibana/x-pack/solutions/security/packages/"
    "kbn-evals-suite-security-persona-matrix/src/datasets/select_shard.ts"
)
PATCHED_SCOUT_CONFIG = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/persona-matrix-maxpayload"
    / "src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/"
    "evals_security_persona_matrix/stateful/classic.stateful.config.ts"
)
# Detection-rule-edit skill (PR #285833): adds the final-answer contract to
# the skill checklist — 62% of detection-rule-edit runs in the 2026-08-21
# sweep ended on a tool call with no user-facing closing message. The base
# image predates the fix, so overlay it like the other patched sources.
PATCHED_RULE_SKILL = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/solutions/security/plugins/security_solution/server/agent_builder/"
    "skills/detection_rule_edit/index.ts"
)
PATCHED_RULE_SKILL_REMOTE = (
    "Projects/kibana/x-pack/solutions/security/plugins/security_solution/server/"
    "agent_builder/skills/detection_rule_edit/index.ts"
)
# Scout readiness: PR #285302 makes SCOUT_READY_TIMEOUT_MS configurable; the
# orca-eval-base-v5 image predates it, so cold-boot rspack compile (303
# bundles) exceeds the hardcoded 180s and every VM fails before the eval
# starts. Overlay the patched eval_stack.ts so run_model.sh's 900s timeout
# actually applies. Sourced from THIS worktree (not scout-timeout-pr): it
# carries the timeout fix AND the agentBuilderTracingExporters pass-through
# (commit 13ad293e8f8a) — overlaying the older scout-timeout-pr copy silently
# dropped the golden trace exporter arg from the boot command (observed
# 2026-09-04: persona2 ran with no xpack.agentBuilder.tracing.exporters and
# golden received 0 spans despite the config/key being shipped).
PATCHED_EVAL_STACK = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/platform/packages/shared/kbn-evals/src/cli/eval_stack.ts"
)
# Playwright per-test timeout: the suite default is 30min, sized for a
# single-pass run. EVAL_REPETITIONS=3 runs die at the default (observed at
# example 7/21 after 30min); the overlaid config reads
# PERSONA_MATRIX_TIMEOUT_MINUTES so determinism runs can raise it.
PATCHED_PW_CONFIG = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/playwright.config.ts"
)
# Trace-evaluator retry budget (commit 1f4d2e2596dc): the 62s budget burned
# inside the OTel flush lag (~3-7 min), erroring Tool Calls/Tokens/Latency/
# SkillInvoked on every VM run. Overlaid like the other patched kbn-evals
# sources — the base image predates the fix.
PATCHED_TRACE_FACTORY = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/platform/packages/shared/kbn-evals/src/evaluators/trace_based/factory.ts"
)
TRACE_FACTORY_REMOTE = (
    "Projects/kibana/x-pack/platform/packages/shared/kbn-evals/src/"
    "evaluators/trace_based/factory.ts"
)
# Golden trace export (regressed 2026-09-01): the base image's kbn-evals/scout
# sources predate agentBuilderTracingExporters support entirely (0 occurrences
# in profiles.ts / eval_stack.ts / classic.stateful.config.ts), so
# config.local.json's key is written but never read and Agent Builder spans
# only land on the VM's local Scout ES. Overlay all three files from this
# worktree so the golden OTLP exporter is appended during stack boot.
PATCHED_PROFILES = (
    KIBANA_MAIN.parent / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/platform/packages/shared/kbn-evals/src/cli/profiles.ts"
)
PROFILES_REMOTE = (
    "Projects/kibana/x-pack/platform/packages/shared/kbn-evals/src/cli/profiles.ts"
)
PATCHED_SCOUT_TRACING_CONFIG = (
    KIBANA_MAIN.parent / "kibana.worktrees/evals-ext-matrix"
    / "src/platform/packages/shared/kbn-scout/src/servers/configs/"
    "config_sets/evals_tracing/stateful/classic.stateful.config.ts"
)
SCOUT_TRACING_CONFIG_REMOTE = (
    "Projects/kibana/src/platform/packages/shared/kbn-scout/src/servers/"
    "configs/config_sets/evals_tracing/stateful/classic.stateful.config.ts"
)
# Env seeds/tools seed/spec live in the matrix branch itself (merged as
# f85527ed "Unbreak failing columns", plus the tool-registration assert).
# Overlay from this worktree — the persona-matrix-env-truth worktree predates
# the assert and would silently drop it on the VM.
PATCHED_ENV_SEEDS = (
    KIBANA_MAIN.parent / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/src/fixtures/env_seeds.ts"
)
PATCHED_TOOLS_SEED = (
    KIBANA_MAIN.parent / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/src/fixtures/persona_matrix_tools_seed.ts"
)
PATCHED_SPEC = (
    KIBANA_MAIN.parent / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/evals/persona_matrix.spec.ts"
)
# The spec imports the tool-registration assert added in f85527ed; the VM
# checkout predates it, so the module must ride along or the spec fails at
# require time ("Cannot find module '../src/fixtures/tool_registration_check'").
PATCHED_TOOL_CHECK = (
    KIBANA_MAIN.parent / "kibana.worktrees/evals-ext-matrix"
    / "x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/src/fixtures/tool_registration_check.ts"
)
FIXTURES_REMOTE_PREFIX = (
    "Projects/kibana/x-pack/solutions/security/packages/"
    "kbn-evals-suite-security-persona-matrix"
)
PATCHED_SCOUT_CONFIG_REMOTE = (
    "Projects/kibana/src/platform/packages/shared/kbn-scout/src/servers/configs/"
    "config_sets/evals_security_persona_matrix/stateful/classic.stateful.config.ts"
)

# Full sweep list: 15 re-runs (need correct SkillInvoked from the patched
# evaluator) + 5 frontier additions not in the published docs matrix.
# Skipped (deterministic, reproduced failures — re-running burns tokens for
# no new information):
#   eis-anthropic-claude-4-5-sonnet   — model emits load_skill({}) under full
#                                       agent context (3/3 repros; 4.6 passes)
#   eis-google-gemini-2-5-flash-lite  — "platform_core_load_skill called but
#                                       was not available" (2/2 repros)
MODELS = [
    # re-run with patched evaluator
    "eis-anthropic-claude-4-5-haiku",
    "eis-anthropic-claude-4-5-opus",
    "eis-anthropic-claude-4-6-sonnet",
    "eis-anthropic-claude-4-6-opus",
    "eis-anthropic-claude-4-7-opus",
    "eis-openai-gpt-5-2",
    "eis-openai-gpt-5-4",
    "eis-openai-gpt-5-4-mini",
    "eis-openai-gpt-5-4-nano",
    "eis-google-gemini-2-5-flash",
    "eis-google-gemini-2-5-pro",
    "eis-google-gemini-3-0-flash",
    "eis-google-gemini-3-1-flash-lite",
    "eis-google-gemini-3-1-pro",
    "eis-google-gemini-3-5-flash",
    # frontier additions (not in the published docs matrix)
    "eis-anthropic-claude-4-8-opus",
    "eis-anthropic-claude-5-sonnet",
    "eis-openai-gpt-5-5",
    "eis-zai-glm-5-2",
    # OpenRouter provider path: needs the on-VM SSE-normalizing proxy +
    # ES endpoint (run_model.sh openrouter- branch). GLM-5.3-flash is the
    # OSS-row candidate; 87.8 calls/example measured 2026-09-03 — pair it
    # with --shards 4, never single-stack.
    "openrouter-zai-glm-5-3-flash",
    # DeepSeek V4 Pro: OSS candidate #2 on the OpenRouter path. Canary
    # 2026-09-03: clean tool call, 1.7s round-trip (10x faster than GLM-5.3).
    # Same proxy + endpoint flow; --shards 4 to start.
    "openrouter-deepseek-v4-pro",
    # Self-hosted Qwen3.8-27B on the A100 (SGLang, 2×TP1 cells). Rides the
    # same on-VM proxy path with PROXY_UPSTREAM=public cell URL + bearer
    # from /tmp/selfhost.env (shipped by deploy()). Quality scorecard for
    # qwen38-local in OmniRoute combos; judge stays on EIS (different family).
    "selfhost-qwen38",
    # NOTE: gemini-3.7-flash exists only as an OpenRouter connector and needs
    # the proxy + ES JAR reasoning patch flow (kibana-evals skill
    # scripts/openrouter-proxy.py). It is NOT in the default sweep; run it as
    # a targeted follow-up.
]


def is_sweep_resource(name: str) -> bool:
    """True when an Azure resource belongs to any suite's sweep VMs.

    Disk/NIC/public-IP/NSG names are all derived from the VM name, so every
    teardown pass must test the SAME set of prefixes. Hardcoding one prefix per
    pass is how a teardown reports success while another suite's disks keep
    billing.
    """
    return any(name.startswith(pf["vm_prefix"] + "-") for pf in SUITE_PROFILES.values())


def model_dir(model: str, suite: Optional[str] = None, shard: Optional[str] = None) -> Path:
    """Per-suite, per-model (per-shard) run directory.

    Namespaced by suite: the same model is swept for persona-matrix, AD and
    migrations, and a flat layout would let the second sweep overwrite the
    first one's run.log and status.json.

    Sharded runs get their own leaf for the same reason -- shard 2 would
    otherwise clobber shard 1's log and status. The "/" in a shard spec is
    replaced, not kept: a raw "2/4" would nest a directory (or escape the
    model dir) instead of naming one.
    """
    leaf = model if not shard else f"{model}-s{shard.replace('/', 'of')}"
    return SWEEP_DIR / (suite or SUITE) / leaf


def ssh(ip: str, cmd: str, timeout: int = 30) -> str:
    r = subprocess.run(
        ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
         "-o", "LogLevel=ERROR",
         "-o", f"ConnectTimeout={timeout}", "-i", SSH_KEY, f"{SSH_USER}@{ip}", cmd],
        capture_output=True, text=True, timeout=timeout + 15)
    return r.stdout.strip() + (("\n" + r.stderr.strip()) if r.stderr.strip() else "")


def az(*args: str) -> str:
    """Run az with retry for transient 'content already consumed' errors."""
    r = subprocess.CompletedProcess([], 1, "", "")
    for attempt in range(3):
        r = subprocess.run(["az", *args], capture_output=True, text=True, timeout=300)
        if r.returncode == 0:
            return r.stdout.strip()
        if "already consumed" in r.stderr and attempt < 2:
            time.sleep(5)
            continue
        raise RuntimeError(f"az {' '.join(args)} failed: {r.stderr[:400]}")
    return r.stdout.strip()


def vm_name(model: str, shard: Optional[str] = None) -> str:
    # Azure Linux VM names allow 64 chars. Do NOT truncate harder than that —
    # a [:24] truncation collided gemini-2-5-flash-lite onto gemini-2-5-flash's
    # VM (dirty ES → 409 dataset conflict).
    prefix = suite_profile()["vm_prefix"]
    # VM_NAME_SUFFIX isolates parallel sweeps of the same model (e.g. judge
    # A/B stability reruns). Without it two sweeps resolve the same VM names
    # and stomp each other's stacks.
    suffix_env = os.environ.get("VM_NAME_SUFFIX", "")
    if suffix_env:
        prefix = f"{prefix}-{suffix_env}"[:40]
    slug = model.replace("eis-", "").replace(".", "-").replace("_", "-")
    # Shard suffix keeps each slice on its own box. Two eval stacks on one VM
    # OOM each other and corrupt local ES, so the suffix is load-bearing.
    # Truncate the MODEL slug, never the suffix: appending first and clamping
    # to 64 silently merges two shards onto one name (verified: a 64-char model
    # made s1of4 and s2of4 identical).
    if shard:
        suffix = f"-s{shard.replace('/', 'of')}"
        budget = 64 - len(prefix) - 1 - len(suffix)
        slug = f"{slug[:budget].rstrip('-')}{suffix}"
    return f"{prefix}-{slug}"[:64].rstrip("-")


def provision(model: str, shard: Optional[str] = None) -> str:
    """Create a D8s_v5 VM; return its public IP.

    Priority: Spot when capacity is available, falling back to Regular.
    2026-09-04: spot capacity for D8s_v5 in the farm region was exhausted
    (SkuServerAvailableOrAlteredByPlatform surfaced as an az-cli crash that
    swallowed the error); 16/42 shards were skipped as "prepare failed".
    SPOT_VM=0 forces Regular; Spot failures auto-fall back to Regular.
    """
    name = vm_name(model, shard)
    print(f"[provision] {name}", flush=True)
    use_spot = os.environ.get("SPOT_VM", "1") == "1"

    def _create(priority: str) -> None:
        args = ["vm", "create", "-g", RG, "-n", name, "--image", IMAGE,
                "--size", VM_SIZE, "--admin-username", SSH_USER, "--ssh-key-values",
                os.path.expanduser("~/.ssh/azure_eval_farm.pub"),
                "--public-ip-sku", "Standard", "--os-disk-size-gb", "128", "--no-wait"]
        if priority == "Spot":
            args += ["--eviction-policy", "Deallocate", "--priority", "Spot"]
        az(*args)

    if use_spot:
        try:
            _create("Spot")
        except (SystemExit, RuntimeError) as e:
            print(f"[provision] spot create failed ({e}); retrying as Regular", flush=True)
            _create("Regular")
    else:
        _create("Regular")
    for _ in range(60):
        time.sleep(10)
        try:
            ip = json.loads(az("vm", "show", "-g", RG, "-n", name, "-d",
                               "--query", "publicIps", "-o", "json"))
            if ip:
                return ip
        except Exception:
            pass
    raise RuntimeError(f"no IP for {name}")


def wait_ssh(ip: str) -> bool:
    for _ in range(30):
        try:
            if "ok" in ssh(ip, "echo ok", timeout=10):
                return True
        except Exception:
            pass
        time.sleep(10)
    return False


def scp(local: str, ip: str, remote: str) -> None:
    subprocess.run(
        ["scp", "-q", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
         "-o", "LogLevel=ERROR",
         "-i", SSH_KEY, local, f"{SSH_USER}@{ip}:{remote}"],
        check=True, timeout=120)


def deploy(ip: str) -> None:
    """Copy run assets + patched evaluator/scout config to the VM."""
    base = Path(__file__).parent
    ssh(ip, "mkdir -p ~/.elastic ~/persona-sweep")
    scp(GOLDEN_ENV_LOCAL, ip, "/tmp/golden-cluster-env.sh")
    scp(str(base / "run_model.sh"), ip, "/tmp/run_model.sh")
    scp(str(base / "export_scores.py"), ip, "/tmp/export_scores.py")
    # OpenRouter path (models named openrouter-*): on-VM SSE-normalizing proxy
    # + ES endpoint creator. Harmless for EIS models — run_model.sh only uses
    # them inside its openrouter- branch.
    scp(str(base / "openrouter_proxy.py"), ip, "/tmp/openrouter_proxy.py")
    scp(str(base / "create_openrouter_endpoint.py"), ip, "/tmp/create_openrouter_endpoint.py")
    # Self-hosted model env (selfhost-* models): upstream URL + bearer for the
    # on-VM proxy. Values come from local secrets; ship only when present so
    # EIS/OpenRouter-only runs need nothing extra.
    selfhost_env = base / ".selfhost.env"
    if selfhost_env.exists():
        scp(str(selfhost_env), ip, "/tmp/selfhost.env")
    # Matrix config carries the OpenRouter API model ids (matchIds) that the
    # connectors cache does NOT. The VM's Kibana checkout is main, not this
    # branch — it lacks the persona-matrix suite entirely, so ship the config.
    matrix_cfg = base.parent.parent / (
        "x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/"
        "persona_matrix.config.json")
    scp(str(matrix_cfg), ip, "/tmp/persona_matrix.config.json")
    scp(os.path.expanduser("~/.elastic/eis-connectors-cache.json"), ip,
        ".elastic/eis-connectors-cache.json")
    scp(os.path.expanduser("~/.elastic/eis-ccm-key.json"), ip,
        ".elastic/eis-ccm-key.json")
    # Overlay the patched SkillInvoked evaluator (PR #286165) and the 50MB
    # maxPayload scout config (PR #286201). The eval runs from TS source via
    # the dev CLI, so copying the files is sufficient — no build step.
    persona_only = SUITE == "security-persona-matrix"
    if persona_only:
        scp(str(PATCHED_EVALUATOR), ip, PATCHED_EVALUATOR_REMOTE)
        scp(str(PATCHED_SCOUT_CONFIG), ip, PATCHED_SCOUT_CONFIG_REMOTE)
    # Per-example failure isolation — see PATCHED_EXECUTOR_CLIENT.
    scp(str(PATCHED_EXECUTOR_CLIENT), ip, EXECUTOR_CLIENT_REMOTE)
    scp(str(PATCHED_EXECUTOR_TYPES), ip, EXECUTOR_TYPES_REMOTE)
    scp(str(PATCHED_HTTP_HANDLER), ip, HTTP_HANDLER_REMOTE)
    scp(str(PATCHED_RETRY_UTILS), ip, RETRY_UTILS_REMOTE)
    scp(str(PATCHED_CHAT_CLIENT), ip, CHAT_CLIENT_REMOTE)
    _gate = ssh(
        ip,
        f"grep -c withRetry ~/{CHAT_CLIENT_REMOTE}; "
        f"grep -c messageSource ~/{CHAT_CLIENT_REMOTE}",
    )
    try:
        _counts = [int(x) for x in _gate.split()]
    except ValueError:
        _counts = [0, 0]
    if len(_counts) != 2 or _counts[0] < 1 or _counts[1] < 1:
        raise RuntimeError(
            f"chat_client overlay did not land on {ip} (withRetry/messageSource "
            f"missing): {_gate!r} -- VM would run main's retries=0 converse path"
        )
    scp(str(PATCHED_TRACE_FACTORY), ip, TRACE_FACTORY_REMOTE)
    scp(str(PATCHED_PROFILES), ip, PROFILES_REMOTE)
    scp(str(PATCHED_SCOUT_TRACING_CONFIG), ip, SCOUT_TRACING_CONFIG_REMOTE)
    if persona_only:
        # Every import evaluate_dataset.ts pulls from ./datasets must exist
        # locally before we ship it. A missing file used to surface only on
        # the VM as "No tests found" after three full stack boots.
        for _src in (PATCHED_DATASET, PATCHED_SHARD):
            if not Path(_src).is_file():
                raise FileNotFoundError(f"overlay source missing: {_src}")
        scp(str(PATCHED_DATASET), ip, DATASET_REMOTE)
        scp(str(PATCHED_SHARD), ip, SHARD_REMOTE)
    # Scout-readiness timeout overlay (PR #285302) — see PATCHED_EVAL_STACK.
    EVAL_STACK_REMOTE = (
        "Projects/kibana/x-pack/platform/packages/shared/kbn-evals/src/cli/eval_stack.ts"
    )
    scp(str(PATCHED_EVAL_STACK), ip, EVAL_STACK_REMOTE)
    # Playwright timeout overlay: default 30min dies mid-run at 3 repetitions
    # (21 examples × 3 reps ≈ 90min; observed death at example 7/21).
    PW_CONFIG_REMOTE = (
        "Projects/kibana/x-pack/solutions/security/packages/"
        "kbn-evals-suite-security-persona-matrix/playwright.config.ts"
    )
    if persona_only:
        scp(str(PATCHED_PW_CONFIG), ip, PW_CONFIG_REMOTE)
        scp(str(PATCHED_RULE_SKILL), ip, PATCHED_RULE_SKILL_REMOTE)
    # Env-truth fixtures (PR #286421): seeds + idempotent tool reinstall + spec wiring.
    if persona_only:
        ssh(ip, f"mkdir -p ~/{FIXTURES_REMOTE_PREFIX}/src/fixtures ~/{FIXTURES_REMOTE_PREFIX}/evals")
        scp(str(PATCHED_ENV_SEEDS), ip, f"{FIXTURES_REMOTE_PREFIX}/src/fixtures/env_seeds.ts")
        scp(str(PATCHED_TOOLS_SEED), ip, f"{FIXTURES_REMOTE_PREFIX}/src/fixtures/persona_matrix_tools_seed.ts")
        scp(str(PATCHED_SPEC), ip, f"{FIXTURES_REMOTE_PREFIX}/evals/persona_matrix.spec.ts")
        scp(str(PATCHED_TOOL_CHECK), ip, f"{FIXTURES_REMOTE_PREFIX}/src/fixtures/tool_registration_check.ts")
        out = ssh(ip, f"grep -q seedPersonaMatrixEnvironment ~/{FIXTURES_REMOTE_PREFIX}/evals/persona_matrix.spec.ts && "
                      f"grep -q assertPersonaMatrixToolsRegistered ~/{FIXTURES_REMOTE_PREFIX}/src/fixtures/tool_registration_check.ts && "
                      f"echo ENVSEEDS_OK")
        if "ENVSEEDS_OK" not in out:
            raise RuntimeError(f"env-truth overlay verification failed on {ip}: {out}")
    infra_checks = [
        f"grep -q SCOUT_READY_TIMEOUT_MS ~/{EVAL_STACK_REMOTE}",
        f"grep -q erroredRuns ~/{EXECUTOR_CLIENT_REMOTE}",
        f"grep -q getStatusCode ~/{RETRY_UTILS_REMOTE}",
        f"grep -q 'retries: 8' ~/{TRACE_FACTORY_REMOTE}",
        f"grep -q agentBuilderTracingExporters ~/{PROFILES_REMOTE}",
        f"grep -q agentBuilderTracingExporters ~/{SCOUT_TRACING_CONFIG_REMOTE}",
    ]
    persona_checks = [
        f"grep -q skillPredicate ~/{PATCHED_EVALUATOR_REMOTE}",
        f"grep -q MAX_PAYLOAD_BYTES ~/{PATCHED_SCOUT_CONFIG_REMOTE}",
        f"grep -q FinalAnswerPresent ~/{PATCHED_EVALUATOR_REMOTE}",
        f"grep -q 'NEVER finish the turn' ~/{PATCHED_RULE_SKILL_REMOTE}",
    ]
    checks = infra_checks + (persona_checks if persona_only else [])
    out = ssh(ip, " && ".join(checks) + " && echo OVERLAY_OK")
    if "OVERLAY_OK" not in out:
        raise RuntimeError(f"patched overlay verification failed on {ip}: {out}")
    print(f"[deploy] assets + patched evaluator/config on {ip}", flush=True)


def build_env_prefix(model: str, environ: Optional[Mapping[str, str]] = None) -> str:
    """Shell prefix exporting every forwarded var for one model's remote run.

    Forward every per-model var (plus any process-env override) rather than a
    hardcoded pair: a var added to MODEL_ENV but missing from this list is a
    silent no-op that looks like a tuning fix and changes nothing. EVAL_CONNECTOR_ID
    belongs here so judge-panel runs actually reach the VM — without it run_model.sh
    silently re-derives its own Anthropic default and the sweep answers the wrong
    question while passing every gate.
    """
    environ = os.environ if environ is None else environ
    model_env = dict([kv.split("=", 1) for kv in MODEL_ENV.get(model, "").split()]) if MODEL_ENV.get(model) else {}
    prefix = ""
    for key in sorted({*model_env, *FORWARDED_ENV_VARS}):
        value = environ.get(key, model_env.get(key, ""))
        if value:
            prefix += f"export {key}={shlex.quote(value)} && "
    return prefix


def self_test() -> int:
    """Offline checks for the pure helpers, run via `--self-test` in the verify
    manifest. Covers the two defects that made a judge-panel sweep lie: a dropped
    EVAL_CONNECTOR_ID (graded with the incumbent judge, still passed its gate) and
    a dead Scout stack reported as `list index out of range`.
    """
    failures = []

    def check(name, got, want):
        if got != want:
            failures.append(f"{name}: expected {want!r}, got {got!r}")

    m = "eis-anthropic-claude-4-7-opus"
    env = {"EVAL_REPETITIONS": "3", "EVAL_CONNECTOR_ID": "eis-google-gemini-3-1-pro"}
    prefix = build_env_prefix(m, env)
    check("judge forwarded", "export EVAL_CONNECTOR_ID=eis-google-gemini-3-1-pro && " in prefix, True)
    check("reps forwarded", "export EVAL_REPETITIONS=3 && " in prefix, True)
    check("no empty exports", "= &&" in prefix, False)
    check("absent var omitted", "PERSONA_MATRIX_TIMEOUT_MINUTES" in build_env_prefix(m, {}), False)
    # Per-model defaults still apply, and the process env wins over them.
    glm = "eis-zai-glm-5-2"
    check("model default kept", "PERSONA_MATRIX_CONCURRENCY=3" in build_env_prefix(glm, {}), True)
    check(
        "env overrides model default",
        "export PERSONA_MATRIX_TIMEOUT_MINUTES=240 && " in build_env_prefix(
            glm, {"PERSONA_MATRIX_TIMEOUT_MINUTES": "240"}
        ),
        True,
    )
    # Shell-quoting: a value with a space must not split into two words.
    check("value quoted", "'a b'" in build_env_prefix(m, {"EVAL_CONNECTOR_ID": "a b"}), True)

    # --- suite port -------------------------------------------------------
    # Every check below pins a defect that would otherwise cost real VM time or
    # silently grade the wrong suite.
    global SUITE
    saved = SUITE
    try:
        # VM names must not collide across suites: same model, two sweeps.
        SUITE = "security-persona-matrix"
        persona_vm = vm_name("eis-openai-gpt-5-4")
        SUITE = "attack-discovery-agent-builder"
        ad_vm = vm_name("eis-openai-gpt-5-4")
        check("vm names differ per suite", persona_vm != ad_vm, True)
        check("ad vm prefix", ad_vm.startswith("orca-ad-"), True)
        check("vm name length", len(ad_vm) <= 64, True)

        # Teardown must claim every suite's resources, or they keep billing.
        check("teardown claims persona", is_sweep_resource(persona_vm + "_OsDisk"), True)
        check("teardown claims ad", is_sweep_resource(ad_vm + "_OsDisk"), True)
        SUITE = "security-automatic-migrations"
        check("teardown claims migrations",
              is_sweep_resource(vm_name("eis-openai-gpt-5-4") + "-nic"), True)
        check("teardown ignores foreign", is_sweep_resource("unrelated-vm_OsDisk"), False)

        # Run dirs are namespaced, so a second suite cannot clobber the first.
        SUITE = "security-persona-matrix"
        d1 = model_dir("eis-openai-gpt-5-4")
        SUITE = "attack-discovery-agent-builder"
        d2 = model_dir("eis-openai-gpt-5-4")
        check("model dirs differ per suite", d1 != d2, True)

        # EVAL_SUITE must reach the VM: without it run_model.sh falls back to
        # persona-matrix and grades the wrong suite while its gate still passes.
        check("EVAL_SUITE forwarded", "EVAL_SUITE" in FORWARDED_ENV_VARS, True)
        prefix = build_env_prefix("eis-openai-gpt-5-4", {"EVAL_SUITE": "attack-discovery-agent-builder"})
        check("EVAL_SUITE exported",
              "export EVAL_SUITE=attack-discovery-agent-builder && " in prefix, True)

        # Doc-count gate: expected docs are per-suite, counted from the datasets.
        check("persona n_examples", SUITE_PROFILES["security-persona-matrix"]["n_examples"], 21)
        check("ad n_examples", SUITE_PROFILES["attack-discovery-agent-builder"]["n_examples"], 9)
        # Migrations has no uniform grid -- per-dataset evaluator counts are
        # 7 (standard-dashboards) / 9 (qradar) / 8 (splunk-spl), measured on the
        # 2026-09-02 canary -- so examples x evaluators is structurally wrong.
        # It gates on a floor measured from that run (86 docs) instead.
        check("migrations gate is floor",
              SUITE_PROFILES["security-automatic-migrations"]["gate"], "floor")
        check("migrations floor set",
              SUITE_PROFILES["security-automatic-migrations"]["min_docs"] > 0, True)

        # Sharding: PERSONA_MATRIX_SHARD must reach the VM, or run_model.sh runs
        # all 21 examples on every shard and the sweep still reports complete.
        # Assert on build_env_prefix output, not list membership: membership
        # passes even if the builder never consults FORWARDED_ENV_VARS.
        check("shard var forwarded to VM",
              "export PERSONA_MATRIX_SHARD=2/4 && " in
              build_env_prefix("m", {"PERSONA_MATRIX_SHARD": "2/4"}), True)
        # Shard sizes must match the suite's stride assignment and sum to the
        # whole dataset -- an off-by-one here FAILs a good run or passes a short one.
        shard_sizes = [len(range(i, 21, 4)) for i in range(4)]
        check("shard sizes stride 21/4", shard_sizes, [6, 5, 5, 5])
        check("shard sizes sum to dataset", sum(shard_sizes), 21)
        check("shard sizes balanced", max(shard_sizes) - min(shard_sizes) <= 1, True)

        # Shard fanout: each (model, shard) needs its OWN VM name and run dir.
        # A shared name would put two eval stacks on one box (they OOM each
        # other and corrupt local ES) or overwrite the sibling's run.log.
        check("shard vm names differ",
              vm_name("eis-openai-gpt-5-4", "1/4") != vm_name("eis-openai-gpt-5-4", "2/4"), True)
        check("unsharded vm name unchanged",
              vm_name("eis-openai-gpt-5-4"), vm_name("eis-openai-gpt-5-4", None))
        check("shard vm name within azure 64-char limit",
              len(vm_name("openrouter-qwen-qwen3-8-27b-longer-name-here", "10/16")) <= 64, True)
        # A model slug long enough to fill the 64-char budget must still yield
        # distinct per-shard names -- appending the suffix before clamping made
        # s1of4 and s2of4 identical and put two stacks on one VM.
        _long = "openrouter-some-really-long-vendor-name-with-many-segments-here-x"
        check("long model name still shards distinctly",
              vm_name(_long, "1/4") != vm_name(_long, "2/4"), True)
        check("long sharded name still within limit", len(vm_name(_long, "1/4")) <= 64, True)
        check("shard run dirs differ",
              model_dir("m", shard="1/4") != model_dir("m", shard="2/4"), True)
        check("unsharded run dir unchanged", model_dir("m"), model_dir("m", shard=None))
        # "/" in a shard spec must not create a nested path or escape the dir.
        check("shard dir has no slash from spec",
              "/" not in model_dir("m", shard="2/4").name, True)

        # --shards fanout: unit expansion decides how many VMs boot.
        def _units(models, shards):
            if shards == 1:
                return [(m, None) for m in models]
            return [(m, f"{i}/{shards}") for m in models for i in range(1, shards + 1)]

        check("shards=1 keeps one unit per model", _units(["a", "b"], 1),
              [("a", None), ("b", None)])
        check("shards=1 leaves shard None (back-compat vm names)",
              vm_name("a", _units(["a"], 1)[0][1]), vm_name("a"))
        check("shards=4 expands to 4 VMs per model", len(_units(["a", "b"], 4)), 8)
        check("every expanded unit is unique", len(set(_units(["a", "b"], 4))), 8)
        check("expanded shards cover 1..N", sorted(str(s) for _, s in _units(["a"], 3)),
              ["1/3", "2/3", "3/3"])
        # Slices must partition the dataset exactly: a stride that dropped or
        # double-counted an example silently changes what the matrix measures.
        _n = SUITE_PROFILES["security-persona-matrix"]["n_examples"]
        _covered = sorted(i for idx in range(1, 5) for i in range(idx - 1, _n, 4))
        check("4 shards partition all 21 examples exactly", _covered, list(range(_n)))

        # The 2026-09-03 smoke run died on every VM because evaluate_dataset.ts
        # imported ./datasets/select_shard and the overlay never shipped it.
        # Parse the real imports and require an overlay entry for each.
        _overlaid = {Path(p).name for p in (PATCHED_DATASET, PATCHED_SHARD)}
        _ed = Path(PATCHED_EVALUATOR)
        if _ed.is_file():
            _imports = set(re.findall(r"from '\./datasets/([a-z_]+)'", _ed.read_text()))
            _missing = {f"{i}.ts" for i in _imports} - _overlaid
            check("every ./datasets import is in the VM overlay", sorted(_missing), [])
            check("overlay actually parsed some imports", len(_imports) > 0, True)

        # Shards must not share a TEST_RUN_ID: execution_id derives from it,
        # and a shared id made shard 2/2 count shard 1/2's docs (154 vs a 140
        # gate) instead of only its own slice.
        check("shard run ids differ",
              shard_run_id("sweep-1", "1/2") != shard_run_id("sweep-1", "2/2"), True)
        check("shard run id keeps the sweep base",
              shard_run_id("sweep-1", "1/2").startswith("sweep-1"), True)
        check("unsharded run id untouched", shard_run_id("sweep-1", None), "sweep-1")
        check("shard run id has no slash",
              "/" not in shard_run_id("sweep-1", "2/4"), True)
        # Testing shard_run_id alone is a false green: deleting launch()'s
        # assignment left every check passing while both VMs shared an id.
        # Assert the wiring by reading launch()'s own source.
        _launch_src = inspect.getsource(launch)
        check("launch assigns a per-shard TEST_RUN_ID",
              'env["TEST_RUN_ID"] = shard_run_id(' in _launch_src, True)
        check("TEST_RUN_ID reaches the VM",
              "export TEST_RUN_ID=sweep-1-s1of2 && " in
              build_env_prefix("m", {"TEST_RUN_ID": shard_run_id("sweep-1", "1/2")}), True)
        # The gate's "latest execution for this model" lookup must be pinned to
        # the shard's own run id. Unpinned, it returned whichever shard wrote
        # last and both shards gated against one id (154 vs a 140 gate) --
        # every earlier check still passed while the sweep stayed broken.
        _gate_src = inspect.getsource(check_golden)
        check("gate builds the shard's own execution id",
              'shard_run_id(os.environ.get("TEST_RUN_ID", ""), shard)' in _gate_src, True)
        # The field has no usable partial matching: a .keyword prefix and a
        # match_phrase on the run id both returned 0 docs against golden while
        # the full id returned 154. Never reintroduce a partial match here.
        check("gate does not prefix-match execution_id",
              'prefix": {"metadata.execution_id' not in _gate_src, True)
        check("sharded gate skips the latest-execution lookup",
              "if exec_id is None:" in _gate_src, True)
        check("ad gate is exact",
              SUITE_PROFILES["attack-discovery-agent-builder"]["gate"], "exact")

        # Unknown suite must fail loudly rather than silently sweeping persona.
        try:
            suite_profile("no-such-suite")
            check("unknown suite rejected", False, True)
        except KeyError:
            pass
    finally:
        SUITE = saved

    # No persona-matrix identity may survive anywhere in the file: the gate
    # resolved "latest execution" by a hardcoded persona-matrix dataset UUID,
    # so on an AD/migrations run it counted the model's OLD persona-matrix
    # execution (294 docs) and compared it to the new suite's expectation.
    # The sweep read as FAIL while the real run was fine -- and would have
    # read as PASS if the numbers had happened to line up.
    src = Path(__file__).read_text()
    check("no hardcoded dataset uuid", ("f2db90e6-cb7f" + "-58f2-b862-1b69e47f6a77") in src, False)
    for suite_id in SUITE_PROFILES:
        check(f"gate scopes to {suite_id}", suite_profile(suite_id)["gate_suite_id"], suite_id)

    print(f"self-test: {len(failures)} failure(s)")
    for f in failures:
        print(f"  FAIL {f}")
    return 1 if failures else 0


def shard_run_id(base: str, shard: Optional[str]) -> str:
    """Per-shard TEST_RUN_ID.

    execution_id is derived from TEST_RUN_ID. Shards that share one id also
    share an execution_id, so each shard's golden gate counts every other
    shard's docs (shard 2/2 read 154 against a 140 gate). Suffixing keeps the
    slices independently countable while staying traceable to one sweep.
    """
    if not shard:
        return base
    return f"{base}-s{shard.replace('/', 'of')}"


def launch(ip: str, model: str, shard: Optional[str] = None) -> subprocess.Popen:
    log = model_dir(model, shard=shard) / "run.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    env["EVAL_SUITE"] = suite_profile()["cli_suite"]
    # Suite reads PERSONA_MATRIX_SHARD for its example stride; per-VM value.
    if shard:
        env["PERSONA_MATRIX_SHARD"] = shard
        # execution_id derives from TEST_RUN_ID. Left unset, every shard VM
        # computes the SAME id, so each shard's golden gate counts all the
        # other shards' docs too (observed: shard 2/2 read 154 docs against a
        # 140 gate because shard 1/2's 154 landed under one id). A per-shard
        # run id keeps the slices independently countable.
        base = env.get("TEST_RUN_ID") or f"sweep-{int(time.time())}"
        env["TEST_RUN_ID"] = shard_run_id(base, shard)
    # Detach on the VM: the eval runs 30-60+ min and holding one long SSH
    # stream is fragile — mid-run stream death (rc 255) previously killed the
    # controller's view while the eval kept running (observed 2026-09-03:
    # every shard FAILED with an unparseable scores response while node/evals
    # was alive on the VM). run_model.sh writes /tmp/unit.done + .rc when it
    # finishes; we poll those over short-lived SSH connections instead.
    run_cmd = (
        f"rm -f /tmp/unit.done /tmp/unit.rc; "
        f"{build_env_prefix(model, env)}nohup bash /tmp/run_model.sh {model} "
        f"> /tmp/unit-run.log 2>&1 < /dev/null & echo launched"
    )
    return subprocess.Popen(
        ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
         "-o", "LogLevel=ERROR",
         "-o", "ServerAliveInterval=30", "-o", "ServerAliveCountMax=60",
         "-i", SSH_KEY, f"{SSH_USER}@{ip}", run_cmd],
        stdout=open(log, "w"), stderr=subprocess.STDOUT)


def _score_id_candidates(canon: str) -> list:
    """Connector ids hyphenate versions (claude-4-5, glm-5-2). Score docs
    dot some (anthropic-claude-4.5-sonnet) and keep hyphens on others
    (zai-glm-5-2), so never assume one spelling -- try both."""
    dotted = re.sub(r"(?<=[0-9])-(?=[0-9])", ".", canon)
    return [canon] if dotted == canon else [dotted, canon]


def _resolve_from_golden(model: str, ip: str) -> dict:
    """Recover stored_id and evaluator count from golden.

    The VM-local index is empty when a run exports straight to golden, which
    is not proof the eval produced nothing. Connector ids hyphenate semantic
    versions while score docs dot them, so match a phrase instead of
    reconstructing the id.
    """
    canon = model[4:] if model.startswith("eis-") else model
    # id spelling varies per vendor, so match any candidate
    body = {
        "size": 0,
        "query": {"bool": {"must": [
            {"bool": {"should": [
                {"match_phrase": {"task.model.id": c}}
                for c in _score_id_candidates(canon)
            ], "minimum_should_match": 1}},
            {"term": {"metadata.suite_id": suite_profile()["gate_suite_id"]}},
        ]}},
        "aggs": {
            "m": {"terms": {"field": "task.model.id", "size": 1}},
            "n": {"cardinality": {"field": "evaluator.name"}},
        },
    }
    fb_q = json.dumps(body)
    out = ssh(
        ip,
        f"source /tmp/golden-cluster-env.sh; printf '%s' '{fb_q}' > /tmp/q_fb.json; "
        f'curl -sS -H "Authorization: ApiKey $GOLDEN_ES_API_KEY" '
        f'"$GOLDEN_ES_URL/.evaluation-scores/_search" '
        f"-H 'Content-Type: application/json' --data @/tmp/q_fb.json",
    )
    try:
        res = json.loads(out.splitlines()[-1])
        buckets = res["aggregations"]["m"]["buckets"]
        if not buckets:
            return {"error": "no docs on golden for this model either"}
        return {
            "stored_id": buckets[0]["key"],
            "n_evaluators": int(res["aggregations"]["n"]["value"]),
        }
    except Exception as exc:
        return {"error": f"golden fallback failed: {exc}"}


def check_golden(model: str, ip: str, shard: Optional[str] = None) -> dict:
    """Completeness gate: docs on golden for this model's LATEST execution.

    Connector IDs use hyphens for semantic versions while score docs use dots,
    so resolve the stored ID from the VM's clean local score index instead of
    guessing with string replacement. The count is scoped to the newest
    `metadata.execution_id` for the model — a model-level count accumulates
    across executions and false-FAILs any model with recent history.

    Expected size is derived, not hardcoded: 21 examples x evaluator count x
    EVAL_REPETITIONS, with the evaluator count read from the local index so
    adding an evaluator (e.g. FinalAnswerPresent) doesn't silently skew the
    gate. (The local index holds evaluator docs only — task output rides on
    those docs' `task.output` — so there is no +1 task doc term.)
    """
    resolve_cmd = (
        "curl -sf -u elastic:changeme 'http://localhost:9220/.evaluation-scores/"
        "_search?size=1&_source=task.model.id' -H 'Content-Type: application/json' "
        "--data '{\"query\":{\"match_all\":{}}}'"
    )
    try:
        raw = ssh(ip, resolve_cmd).strip()
    except Exception as exc:
        return {"count": -1, "error": f"ssh failed while reading local scores index: {exc}"}
    if not raw:
        # curl -sf prints nothing when the endpoint refuses the connection, so an
        # empty body means the Scout stack is down (or never booted) rather than
        # an empty index. Say that, instead of an IndexError from splitlines()[-1]
        # surfacing as a misleading "cannot read local scores index".
        return {
            "count": -1,
            "error": (
                "no response from local scores index on "
                f"{ip}:9220 — Scout ES/Kibana is not reachable (check EVAL_EXIT "
                "and the stack boot log; the eval likely died before scoring)"
            ),
        }
    try:
        local = json.loads(raw.splitlines()[-1])
        hits = local["hits"]["hits"]
    except Exception as exc:
        return {"count": -1, "error": f"cannot parse local scores index response: {exc}"}
    if not hits:
        # A run that exports straight to golden leaves the VM-local index
        # empty. That is not proof the eval produced nothing, so resolve
        # the same two facts from golden and let the doc-count gate below
        # deliver the verdict.
        fallback = _resolve_from_golden(model, ip)
        if fallback.get("error"):
            return {"count": 0, "error": fallback["error"]}
        stored_id = fallback["stored_id"]
        n_evaluators = fallback["n_evaluators"]
    else:
        stored_id = hits[0]["_source"]["task"]["model"]["id"]
        n_evaluators = None

    if n_evaluators is None:
        eval_count_cmd = (
            "curl -sf -u elastic:changeme 'http://localhost:9220/.evaluation-scores/"
            "_search?size=0' -H 'Content-Type: application/json' --data "
            "'{\"aggs\":{\"n\":{\"cardinality\":{\"field\":\"evaluator.name\"}}}}'"
        )
        try:
            local2 = json.loads(ssh(ip, eval_count_cmd).splitlines()[-1])
            n_evaluators = int(local2["aggregations"]["n"]["value"])
        except Exception as exc:
            return {"count": -1, "error": f"cannot count local evaluators: {exc}"}

    # With sharding, several VMs run the SAME model against the same suite and
    # each writes its own execution_id. A "latest for this model" lookup then
    # returns whichever shard finished last, and every shard gates against that
    # one id -- shard 2/2 counted shard 1/2's 154 docs against its 140 gate.
    #
    # execution_id is "<run id>::<suite>::<model>" and the field does NOT
    # support partial matching: a prefix on .keyword and a match_phrase on the
    # run id both return 0 docs (verified against golden). Only the full id
    # matches, so build it rather than filtering the "latest" lookup.
    if shard:
        _run_id = shard_run_id(os.environ.get("TEST_RUN_ID", ""), shard)
        exec_id = f"{_run_id}::{suite_profile()['gate_suite_id']}::{stored_id}"
    else:
        exec_id = None
    _latest_must = [
        {"term": {"task.model.id": stored_id}},
        {"term": {"metadata.suite_id": suite_profile()["gate_suite_id"]}},
    ]
    latest_cmd_q = json.dumps({
        "size": 1,
        "_source": ["metadata.execution_id"],
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {"bool": {"must": _latest_must}},
    })
    # NOTE: cmd is passed to ssh as a single argv (no local shell), so the
    # remote shell is the ONLY quoting layer — use plain double quotes.
    # Backslash-escaped \" lands as a literal quote, splits the header on its
    # space, and curl then treats "ApiKey" as a URL (2026-08-22 v3 gate
    # failure: "Could not resolve host: ApiKey").
    # A sharded run already knows its exact execution_id, so skip the lookup
    # entirely -- querying "latest for this model" would just re-introduce the
    # cross-shard collision this function exists to avoid.
    if exec_id is None:
        out = ssh(
            ip,
            f"source /tmp/golden-cluster-env.sh; printf '%s' '{latest_cmd_q}' > /tmp/q_latest.json; "
            f'curl -sS -H "Authorization: ApiKey $GOLDEN_ES_API_KEY" '
            f'"$GOLDEN_ES_URL/.evaluation-scores/_search" '
            f"-H 'Content-Type: application/json' --data @/tmp/q_latest.json",
        )
        try:
            hits = json.loads(out.splitlines()[-1])["hits"]["hits"]
            exec_id = hits[0]["_source"]["metadata"]["execution_id"]
        except Exception:
            return {"count": -1, "error": f"cannot resolve latest execution id: {out[:200]}"}

    q = json.dumps({"query": {"term": {"metadata.execution_id.keyword": exec_id}}})
    out = ssh(
        ip,
        f"source /tmp/golden-cluster-env.sh; printf '%s' '{q}' > /tmp/q.json; "
        f'curl -sS -H "Authorization: ApiKey $GOLDEN_ES_API_KEY" '
        f'"$GOLDEN_ES_URL/.evaluation-scores/_count" '
        f"-H 'Content-Type: application/json' --data @/tmp/q.json",
    )
    try:
        result = json.loads(out.splitlines()[-1])
    except Exception:
        return {"count": -1, "error": out[:200]}
    if result.get("count", 0) == 0:
        # mapping without a .keyword subfield — match_phrase works on text
        q = json.dumps({"query": {"match_phrase": {"metadata.execution_id": exec_id}}})
        out = ssh(
            ip,
            f"source /tmp/golden-cluster-env.sh; printf '%s' '{q}' > /tmp/q.json; "
            f'curl -sS -H "Authorization: ApiKey $GOLDEN_ES_API_KEY" '
            f'"$GOLDEN_ES_URL/.evaluation-scores/_count" '
            f"-H 'Content-Type: application/json' --data @/tmp/q.json",
        )
        try:
            result = json.loads(out.splitlines()[-1])
        except Exception:
            return {"count": -1, "error": out[:200]}
    reps = int(os.environ.get("EVAL_REPETITIONS", "1") or "1")
    prof = suite_profile()
    if prof.get("gate") == "floor":
        # Suites whose datasets carry different evaluator counts (migrations:
        # 7 / 9 / 8) have no examples x evaluators product. Gate on a floor
        # measured from a canary run, and report it as such.
        result["expected"] = prof["min_docs"]
        result["gate"] = "floor"
    else:
        # A sharded run only produces its own slice, so the exact gate must
        # expect that slice -- not the whole dataset -- or every shard FAILs.
        # Shard sizes follow the suite's stride assignment (index k -> shard
        # k % total), so shard i holds ceil((n - (i-1)) / total) examples.
        n_examples = prof["n_examples"]
        if shard:
            idx, total = (int(x) for x in shard.split("/"))
            n_examples = len(range(idx - 1, n_examples, total))
            result["shard"] = shard
        result["expected"] = n_examples * n_evaluators * reps
        result["gate"] = "exact"
    result["execution_id"] = exec_id
    return result


def status() -> None:
    root = SWEEP_DIR / SUITE
    for model in sorted(os.listdir(root)) if root.exists() else []:
        p = model_dir(model) / "status.json"
        if p.exists():
            s = json.load(open(p))
            print(f"  {model:45} {s.get('state', '?'):10} docs={s.get('docs', '?')}")


def prepare(model: str, shard: Optional[str] = None) -> tuple[str, str]:
    """Provision + deploy one model's VM. Returns (model, ip)."""
    ip = provision(model, shard)
    if not wait_ssh(ip):
        raise RuntimeError(f"ssh never ready: {model} @ {ip}")
    # A VM whose sshd accepts TCP before it accepts auth, or that hits a
    # transient scp reset, used to abort the ENTIRE sweep here (2026-08-22:
    # 17/19 deployed, one scp failure, zero launches). Retry once after a
    # short wait; a genuinely dead VM raises and is skipped by the caller.
    try:
        deploy(ip)
    except subprocess.CalledProcessError:
        time.sleep(30)
        deploy(ip)
    return model, ip


def _label(model: str, shard: Optional[str] = None) -> str:
    """Human label for one sweep unit; shard suffix only when sharding."""
    return f"{model} [shard {shard}]" if shard else model


def _model_state(model: str, shard: Optional[str] = None) -> str:
    """Read the state a model last wrote, so skips count as failures too."""
    try:
        with open(model_dir(model, shard=shard) / "status.json") as fh:
            return json.load(fh).get("state", "UNKNOWN")
    except Exception:
        return "UNKNOWN"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", default="all")
    # Provision/deploy fan-out. Each VM is 8 vCPUs against a 350 low-priority
    # vCPU regional quota (~43 concurrent), so the ceiling here is Azure API
    # politeness and local ssh/scp load, not quota.
    ap.add_argument("--provision-workers", type=int, default=5,
                    help="parallel VM provision+deploy workers. Raising this "
                         "trades wall-clock for boot races: at 8 on 2026-09-02, "
                         "5/15 VMs lost the CCM/.inference readiness race "
                         "(fetch failed -> enable_eis_ccm exit 1). run_model.sh "
                         "now retries that step 3x, but 5 is the tested default.")
    ap.add_argument("--shards", type=int, default=1,
                    help="split the dataset across N VMs per model. Each VM "
                         "runs a stride slice (PERSONA_MATRIX_SHARD=i/N). Use "
                         "for slow models: GLM-5.3 needs ~174min on one VM, "
                         "~45min at --shards 4. Frontier models need 1.")
    ap.add_argument("--only-shard", type=int, default=None,
                    help="backfill a single shard i of a --shards N sweep; "
                         "keeps VM names + example stride identical to the "
                         "original run so the golden gate merges cleanly")
    ap.add_argument("--suite", default="security-persona-matrix",
                    choices=sorted(SUITE_PROFILES),
                    help="eval suite to sweep; selects overlays, VM prefix and doc gate")
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--teardown", action="store_true")
    ap.add_argument("--self-test", action="store_true",
                    help="offline checks for the pure helpers; no Azure or SSH")
    args = ap.parse_args()

    global SUITE
    SUITE = args.suite

    if args.self_test:
        return self_test()

    if args.status:
        status()
        return
    if args.teardown:
        for vm in json.loads(az("vm", "list", "-g", RG, "-o", "json")):
            if any(vm["name"].startswith(pf["vm_prefix"] + "-")
                   for pf in SUITE_PROFILES.values()):
                az("vm", "delete", "-g", RG, "-n", vm["name"], "--yes", "--no-wait")
                print(f"[teardown] deleting {vm['name']}")
        # `az vm delete` removes ONLY the VM. Its disk, NIC and public IP
        # survive and keep billing -- disks are the expensive ones, and NICs
        # pin their public IP so ordering matters (NIC first, then IP).
        # Observed 2026-09-02: a "successful" teardown left 3 disks, 5 NICs
        # and 5 public IPs behind, two of them from sweeps days earlier.
        # --no-wait above means VMs may still be detaching; poll until the
        # disks actually report Unattached rather than racing them.
        print("[teardown] waiting for disks to detach...")
        for _ in range(60):
            disks = json.loads(az("disk", "list", "-g", RG, "-o", "json"))
            sweep = [d for d in disks if is_sweep_resource(d["name"])]
            if not sweep or all(d.get("diskState") == "Unattached" for d in sweep):
                break
            time.sleep(5)

        for d in json.loads(az("disk", "list", "-g", RG, "-o", "json")):
            if is_sweep_resource(d["name"]) and d.get("diskState") == "Unattached":
                az("disk", "delete", "-g", RG, "-n", d["name"], "--yes", "--no-wait")
                print(f"[teardown] deleting disk {d['name']}")

        for n in json.loads(az("network", "nic", "list", "-g", RG, "-o", "json")):
            if is_sweep_resource(n["name"]) and not n.get("virtualMachine"):
                az("network", "nic", "delete", "-g", RG, "-n", n["name"])
                print(f"[teardown] deleting nic {n['name']}")

        for p in json.loads(az("network", "public-ip", "list", "-g", RG, "-o", "json")):
            if is_sweep_resource(p["name"]) and not p.get("ipConfiguration"):
                az("network", "public-ip", "delete", "-g", RG, "-n", p["name"])
                print(f"[teardown] deleting public-ip {p['name']}")

        # `az vm create` also auto-creates one NSG per VM. Nothing deleted these,
        # so they accumulated one-per-sweep (68 found on 2026-09-02, every one
        # detached). They cost nothing, but they bury real resources in the RG
        # and make "is this group clean?" unanswerable at a glance. Only ever
        # delete NSGs that belong to a sweep VM AND are attached to nothing --
        # the shared vnet and the orca-eval-base-* image must survive.
        for g in json.loads(az("network", "nsg", "list", "-g", RG, "-o", "json")):
            detached = not g.get("networkInterfaces") and not g.get("subnets")
            if is_sweep_resource(g["name"]) and detached:
                az("network", "nsg", "delete", "-g", RG, "-n", g["name"])
                print(f"[teardown] deleting nsg {g['name']}")

        left = {
            "vms": len(json.loads(az("vm", "list", "-g", RG, "-o", "json"))),
            "disks": len(json.loads(az("disk", "list", "-g", RG, "-o", "json"))),
            "nics": len(json.loads(az("network", "nic", "list", "-g", RG, "-o", "json"))),
            "pubips": len(json.loads(az("network", "public-ip", "list", "-g", RG, "-o", "json"))),
            "sweep_nsgs": len(
                [
                    g
                    for g in json.loads(az("network", "nsg", "list", "-g", RG, "-o", "json"))
                    if is_sweep_resource(g["name"])
                ]
            ),
        }
        print(f"[teardown] remaining: {left}")
        return

    models = MODELS if args.models == "all" else [m.strip() for m in args.models.split(",")]
    if args.shards < 1:
        print("--shards must be >= 1", flush=True)
        return 2
    # A "unit" is one VM's worth of work: (model, shard). shard is None at
    # --shards 1 so unsharded run dirs and VM names stay byte-identical to
    # every sweep before this flag existed.
    if args.shards == 1:
        units = [(m, None) for m in models]
    else:
        units = [(m, f"{i}/{args.shards}")
                 for m in models for i in range(1, args.shards + 1)]
    # --only-shard: backfill one failed shard of a larger sweep without
    # re-provisioning the passing shards. Must be used with --shards N so the
    # shard string (and thus VM name + example stride) matches the original.
    if args.only_shard is not None:
        if args.shards == 1:
            print("--only-shard requires --shards > 1", flush=True)
            return 2
        keep = f"{args.only_shard}/{args.shards}"
        units = [(m, s) for m, s in units if s == keep]
        if not units:
            print(f"--only-shard {keep}: no unit matched", flush=True)
            return 2
        print(f"only-shard backfill: {keep}", flush=True)
    print(f"sweep models ({len(models)}): {', '.join(models)}", flush=True)
    # Fail before provisioning: a missing local asset otherwise surfaces as an
    # scp error on every VM, after the whole farm is already booted and billing.
    _required = [GOLDEN_ENV_LOCAL,
                 os.path.expanduser("~/.elastic/eis-connectors-cache.json")]
    _absent = [p for p in _required if not os.path.isfile(p)]
    if _absent:
        print(f"PREFLIGHT FAILED: missing local assets: {_absent}", flush=True)
        return 2
    if args.shards > 1:
        print(f"sharding: {args.shards} VMs/model -> {len(units)} VMs total", flush=True)
        # One base per sweep, suffixed per shard in launch(). Computing the
        # base inside launch() would stamp each shard with a different base
        # and leave the slices unrelatable after the fact.
        os.environ.setdefault(
            "TEST_RUN_ID", f"sweep-{int(time.time())}{('-' + os.environ['VM_NAME_SUFFIX']) if os.environ.get('VM_NAME_SUFFIX') else ''}"
        )
        print(f"run id base: {os.environ['TEST_RUN_ID']}", flush=True)

    # Provision + deploy in parallel (independent per VM); launches stay serial.
    ips: dict[tuple, str] = {}
    with ThreadPoolExecutor(max_workers=args.provision_workers) as pool:
        # as_completed + try/except so one dead VM (eviction, sshd race)
        # loses its cell instead of killing the whole sweep before launch.
        futures = {pool.submit(prepare, model, shard): (model, shard)
                   for model, shard in units}
        for fut in as_completed(futures):
            unit = futures[fut]
            model, shard = unit
            try:
                _, ip = fut.result()
            except Exception as exc:
                print(f"[skip] {_label(model, shard)}: prepare failed ({exc})", flush=True)
                model_dir(model, shard=shard).mkdir(parents=True, exist_ok=True)
                json.dump({"model": model, "shard": shard, "state": "FAIL",
                           "error": f"prepare: {exc}"},
                          open(model_dir(model, shard=shard) / "status.json", "w"))
                continue
            ips[unit] = ip
            model_dir(model, shard=shard).mkdir(parents=True, exist_ok=True)
            json.dump({"ip": ip, "model": model, "shard": shard, "state": "booting"},
                      open(model_dir(model, shard=shard) / "status.json", "w"))

    reused = {}
    for unit, ip in ips.items():
        if ip in reused:
            raise RuntimeError(
                f"VM collision: {_label(*unit)} and {_label(*reused[ip])} both "
                f"mapped to {ip}. Every unit must own its VM stack — two eval "
                "stacks on one box OOM each other, corrupt local ES, and wedge SSH."
            )
        reused[ip] = unit

    procs = []
    for model, shard in units:
        if (model, shard) not in ips:
            continue
        ip = ips[(model, shard)]
        procs.append((model, shard, ip, launch(ip, model, shard)))
        print(f"[launch] {_label(model, shard)} @ {ip}", flush=True)

    print("\nAll launches issued. Waiting for completion + golden gate.", flush=True)
    for model, shard, ip, p in procs:
        p.wait()  # returns when the quick "launch" ssh exits (immediately)
        # Poll the detached VM-side markers. Cap at 6h (slow reasoning models
        # at 240-min per-example timeouts can legitimately run for hours).
        deadline = time.time() + 6 * 3600
        rc = None
        while time.time() < deadline:
            probe = subprocess.run(
                ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
                 "-o", "LogLevel=ERROR", "-o", "ConnectTimeout=15",
                 "-i", SSH_KEY, f"{SSH_USER}@{ip}",
                 "if [ -f /tmp/unit.done ]; then echo done $(cat /tmp/unit.rc 2>/dev/null); fi"],
                capture_output=True, text=True, timeout=60)
            out = probe.stdout.strip()
            if out.startswith("done"):
                parts = out.split()
                rc = int(parts[1]) if len(parts) > 1 and parts[1].lstrip("-").isdigit() else 1
                break
            time.sleep(60)
        if rc is None:
            rc = 1  # timed out or markers unreadable — never green by default
        result = check_golden(model, ip, shard)
        # Expected size is derived inside check_golden from the live evaluator
        # count on the VM (21 examples x (evaluators + 1 task doc) x reps).
        expected_docs = result.get("expected", -1)
        count = result.get("count", -1)
        # Never green on unresolved numbers: count == expected == -1 would
        # otherwise PASS a run that produced nothing (observed when the spec
        # overlay missed tool_registration_check.ts and every run died at
        # require time).
        gate_kind = result.get("gate", "exact")
        meets = (
            count >= expected_docs if gate_kind == "floor" else count == expected_docs
        )
        state = (
            "PASS"
            if rc == 0
            and not result.get("error")
            and isinstance(count, int)
            and count > 0
            and meets
            else "FAIL"
        )
        json.dump({"ip": ip, "model": model, "shard": shard, "state": state,
                   "docs": result.get("count", -1), "rc": rc,
                   "execution_id": result.get("execution_id"),
                   "error": result.get("error")},
                  open(model_dir(model, shard=shard) / "status.json", "w"), indent=2)
        print(f"[done] {_label(model, shard)}: {state} docs={result.get('count', -1)}/{expected_docs}"
              + (f" ({result['error']})" if result.get("error") else ""), flush=True)


    # A sweep that skipped or failed every model must not look like a green
    # run to its caller: report the count so CI and shell wrappers can gate.
    # A sweep that skipped or failed any UNIT must not look green: with
    # sharding a model is only complete when every one of its shards passed,
    # so tally units. Tallying models here would let a dead shard — a missing
    # third of the dataset — report success.
    failed = [_label(m, s) for m, s in units if _model_state(m, s) != "PASS"]
    if failed:
        print(f"SWEEP FAILED: {len(failed)}/{len(units)} units did not pass: {failed}", flush=True)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
