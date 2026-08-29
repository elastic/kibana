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
- Judge: fixed EVAL_CONNECTOR_ID=eis-anthropic-claude-4-6-sonnet for ALL
  models (comparability; self-judging bias exists in the docs matrix too).

Usage:
  python3 persona_matrix_sweep.py --models all          # full re-sweep
  python3 persona_matrix_sweep.py --models "eis-a,eis-b"
  python3 persona_matrix_sweep.py --status
  python3 persona_matrix_sweep.py --teardown            # delete orca-sweep-* VMs
"""
import argparse
import json
import sys
import os
import shlex
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

SSH_KEY = os.path.expanduser("~/.ssh/azure_eval_farm")
SSH_USER = "orcaeval"
IMAGE = json.load(open(Path(__file__).parent / ".azure-state.json"))["imageId"]
RG = "orca-eval-farm"
VM_SIZE = "Standard_D8s_v5"

# Per-model env for run_model.sh. Slow chat models blow the default 30-min
# Playwright cap mid-suite (glm-5-2 died at example 16/21 on 2026-08-22).
MODEL_ENV = {"eis-zai-glm-5-2": "PERSONA_MATRIX_TIMEOUT_MINUTES=60 PERSONA_MATRIX_CONCURRENCY=3"}
GOLDEN_ENV_LOCAL = "/tmp/golden-cluster-env.sh"
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
# actually applies.
PATCHED_EVAL_STACK = (
    KIBANA_MAIN.parent
    / "kibana.worktrees/scout-timeout-pr"
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
    # NOTE: gemini-3.7-flash exists only as an OpenRouter connector and needs
    # the proxy + ES JAR reasoning patch flow (kibana-evals skill
    # scripts/openrouter-proxy.py). It is NOT in the default sweep; run it as
    # a targeted follow-up.
]


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


def vm_name(model: str) -> str:
    # Azure Linux VM names allow 64 chars. Do NOT truncate harder than that —
    # a [:24] truncation collided gemini-2-5-flash-lite onto gemini-2-5-flash's
    # VM (dirty ES → 409 dataset conflict).
    return ("orca-sweep-" + model.replace("eis-", "").replace(".", "-").replace("_", "-"))[:64].rstrip("-")


def provision(model: str) -> str:
    """Create a D8s_v5 spot VM; return its public IP."""
    name = vm_name(model)
    print(f"[provision] {name}", flush=True)
    az("vm", "create", "-g", RG, "-n", name, "--image", IMAGE, "--size", VM_SIZE,
       "--eviction-policy", "Deallocate", "--priority", "Spot",
       "--admin-username", SSH_USER, "--ssh-key-values",
       os.path.expanduser("~/.ssh/azure_eval_farm.pub"),
       "--public-ip-sku", "Standard", "--os-disk-size-gb", "128", "--no-wait")
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
    scp(os.path.expanduser("~/.elastic/eis-connectors-cache.json"), ip,
        ".elastic/eis-connectors-cache.json")
    scp(os.path.expanduser("~/.elastic/eis-ccm-key.json"), ip,
        ".elastic/eis-ccm-key.json")
    # Overlay the patched SkillInvoked evaluator (PR #286165) and the 50MB
    # maxPayload scout config (PR #286201). The eval runs from TS source via
    # the dev CLI, so copying the files is sufficient — no build step.
    scp(str(PATCHED_EVALUATOR), ip, PATCHED_EVALUATOR_REMOTE)
    scp(str(PATCHED_SCOUT_CONFIG), ip, PATCHED_SCOUT_CONFIG_REMOTE)
    # Per-example failure isolation — see PATCHED_EXECUTOR_CLIENT.
    scp(str(PATCHED_EXECUTOR_CLIENT), ip, EXECUTOR_CLIENT_REMOTE)
    scp(str(PATCHED_EXECUTOR_TYPES), ip, EXECUTOR_TYPES_REMOTE)
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
    scp(str(PATCHED_PW_CONFIG), ip, PW_CONFIG_REMOTE)
    scp(str(PATCHED_RULE_SKILL), ip, PATCHED_RULE_SKILL_REMOTE)
    # Env-truth fixtures (PR #286421): seeds + idempotent tool reinstall + spec wiring.
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
    out = ssh(ip, f"grep -q skillPredicate ~/{PATCHED_EVALUATOR_REMOTE} && "
                  f"grep -q MAX_PAYLOAD_BYTES ~/{PATCHED_SCOUT_CONFIG_REMOTE} && "
                  f"grep -q SCOUT_READY_TIMEOUT_MS ~/{EVAL_STACK_REMOTE} && "
                  f"grep -q erroredRuns ~/{EXECUTOR_CLIENT_REMOTE} && "
                  f"grep -q FinalAnswerPresent ~/{PATCHED_EVALUATOR_REMOTE} && "
                  f"grep -q 'NEVER finish the turn' ~/{PATCHED_RULE_SKILL_REMOTE} && "
                  f"echo OVERLAY_OK")
    if "OVERLAY_OK" not in out:
        raise RuntimeError(f"patched overlay verification failed on {ip}: {out}")
    print(f"[deploy] assets + patched evaluator/config on {ip}", flush=True)


def launch(ip: str, model: str) -> subprocess.Popen:
    log = SWEEP_DIR / model / "run.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    # Forward EVAL_REPETITIONS when set so determinism runs (e.g. =3) can
    # multiply repetitions without editing run_model.sh per-run. run_model.sh
    # defaults it to 1 when absent, preserving the sweep's single-pass behavior.
    # Per-model defaults from MODEL_ENV; the process env overrides them.
    model_env = dict([kv.split("=", 1) for kv in MODEL_ENV.get(model, "").split()]) if MODEL_ENV.get(model) else {}
    # Forward every per-model var (plus any process-env override) rather than a
    # hardcoded pair: a var added to MODEL_ENV but missing from this list is a
    # silent no-op that looks like a tuning fix and changes nothing.
    env_prefix = ""
    for key in sorted({*model_env, "EVAL_REPETITIONS", "PERSONA_MATRIX_TIMEOUT_MINUTES"}):
        value = os.environ.get(key, model_env.get(key, ""))
        if value:
            env_prefix += f"export {key}={shlex.quote(value)} && "
    return subprocess.Popen(
        ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
         "-o", "LogLevel=ERROR",
         "-o", "ServerAliveInterval=30", "-o", "ServerAliveCountMax=60",
         "-i", SSH_KEY, f"{SSH_USER}@{ip}", f"{env_prefix}bash /tmp/run_model.sh {model}"],
        stdout=open(log, "w"), stderr=subprocess.STDOUT)


def check_golden(model: str, ip: str) -> dict:
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
        local = json.loads(ssh(ip, resolve_cmd).splitlines()[-1])
        hits = local["hits"]["hits"]
    except Exception as exc:
        return {"count": -1, "error": f"cannot read local scores index: {exc}"}
    if not hits:
        return {"count": 0, "error": "local scores index is empty: the eval produced no docs"}
    stored_id = hits[0]["_source"]["task"]["model"]["id"]

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

    latest_cmd_q = json.dumps({
        "size": 1,
        "_source": ["metadata.execution_id"],
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {"bool": {"must": [
            {"term": {"task.model.id": stored_id}},
            {"term": {"example.dataset.id": "f2db90e6-cb7f-58f2-b862-1b69e47f6a77"}},
        ]}},
    })
    # NOTE: cmd is passed to ssh as a single argv (no local shell), so the
    # remote shell is the ONLY quoting layer — use plain double quotes.
    # Backslash-escaped \" lands as a literal quote, splits the header on its
    # space, and curl then treats "ApiKey" as a URL (2026-08-22 v3 gate
    # failure: "Could not resolve host: ApiKey").
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
    result["expected"] = 21 * n_evaluators * reps
    result["execution_id"] = exec_id
    return result


def status() -> None:
    for model in os.listdir(SWEEP_DIR) if SWEEP_DIR.exists() else []:
        p = SWEEP_DIR / model / "status.json"
        if p.exists():
            s = json.load(open(p))
            print(f"  {model:45} {s.get('state', '?'):10} docs={s.get('docs', '?')}")


def prepare(model: str) -> tuple[str, str]:
    """Provision + deploy one model's VM. Returns (model, ip)."""
    ip = provision(model)
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


def _model_state(model: str) -> str:
    """Read the state a model last wrote, so skips count as failures too."""
    try:
        with open(SWEEP_DIR / model / "status.json") as fh:
            return json.load(fh).get("state", "UNKNOWN")
    except Exception:
        return "UNKNOWN"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", default="all")
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--teardown", action="store_true")
    args = ap.parse_args()

    if args.status:
        status()
        return
    if args.teardown:
        for vm in json.loads(az("vm", "list", "-g", RG, "-o", "json")):
            if vm["name"].startswith("orca-sweep-"):
                az("vm", "delete", "-g", RG, "-n", vm["name"], "--yes", "--no-wait")
                print(f"[teardown] deleting {vm['name']}")
        return

    models = MODELS if args.models == "all" else [m.strip() for m in args.models.split(",")]
    print(f"sweep models ({len(models)}): {', '.join(models)}", flush=True)

    # Provision + deploy in parallel (independent per VM); launches stay serial.
    ips: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=5) as pool:
        # as_completed + try/except so one dead VM (eviction, sshd race)
        # loses its cell instead of killing the whole sweep before launch.
        futures = {pool.submit(prepare, model): model for model in models}
        for fut in as_completed(futures):
            model = futures[fut]
            try:
                _, ip = fut.result()
            except Exception as exc:
                print(f"[skip] {model}: prepare failed ({exc})", flush=True)
                (SWEEP_DIR / model).mkdir(parents=True, exist_ok=True)
                json.dump({"model": model, "state": "FAIL", "error": f"prepare: {exc}"},
                          open(SWEEP_DIR / model / "status.json", "w"))
                continue
            ips[model] = ip
            (SWEEP_DIR / model).mkdir(parents=True, exist_ok=True)
            json.dump({"ip": ip, "model": model, "state": "booting"},
                      open(SWEEP_DIR / model / "status.json", "w"))

    reused = {}
    for model, ip in ips.items():
        if ip in reused:
            raise RuntimeError(
                f"VM collision: {model} and {reused[ip]} both mapped to {ip}. "
                "Every model must own its VM stack — two eval stacks on one box "
                "OOM each other, corrupt local ES, and wedge SSH."
            )
        reused[ip] = model

    procs = []
    for model in models:
        if model not in ips:
            continue
        procs.append((model, ips[model], launch(ips[model], model)))
        print(f"[launch] {model} @ {ips[model]}", flush=True)

    print("\nAll launches issued. Waiting for completion + golden gate.", flush=True)
    for model, ip, p in procs:
        rc = p.wait()
        result = check_golden(model, ip)
        # Expected size is derived inside check_golden from the live evaluator
        # count on the VM (21 examples x (evaluators + 1 task doc) x reps).
        expected_docs = result.get("expected", -1)
        count = result.get("count", -1)
        # Never green on unresolved numbers: count == expected == -1 would
        # otherwise PASS a run that produced nothing (observed when the spec
        # overlay missed tool_registration_check.ts and every run died at
        # require time).
        state = (
            "PASS"
            if rc == 0
            and not result.get("error")
            and isinstance(count, int)
            and count > 0
            and count == expected_docs
            else "FAIL"
        )
        json.dump({"ip": ip, "model": model, "state": state,
                   "docs": result.get("count", -1), "rc": rc,
                   "execution_id": result.get("execution_id"),
                   "error": result.get("error")},
                  open(SWEEP_DIR / model / "status.json", "w"), indent=2)
        print(f"[done] {model}: {state} docs={result.get('count', -1)}/{expected_docs}"
              + (f" ({result['error']})" if result.get("error") else ""), flush=True)


    # A sweep that skipped or failed every model must not look like a green
    # run to its caller: report the count so CI and shell wrappers can gate.
    failed = [m for m in models if _model_state(m) != "PASS"]
    if failed:
        print(f"SWEEP FAILED: {len(failed)}/{len(models)} models did not pass: {failed}", flush=True)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
