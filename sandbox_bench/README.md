# Kibana Sandbox Provider Benchmark

A benchmark harness for comparing sandbox providers (e2b, Daytona, Modal, Namespace, Vercel
Sandbox, GCP/Cloud Workstations, Kubernetes agent-sandbox, Firecracker microVMs, plain Docker, …)
on **real Kibana workloads**, in the spirit of
[computesdk/benchmarks](https://github.com/computesdk/benchmarks) — but measuring what actually
matters for agentic development on a 3 GB TypeScript monorepo with a two-service stack, instead of
time-to-`node -v`.

## Why a Kibana-specific benchmark

Generic sandbox benchmarks measure **Time To Interactive (TTI)**: create a sandbox, run `node -v`,
report P50/P95/P99 over 100 iterations. That is a fine proxy for "how fast can I run a snippet",
and useless for the question agent platforms working on Kibana actually face:

> How long until an agent inside this sandbox has a Kibana checkout it can edit, test, and — for
> the hardest tasks — a **live Kibana + Elasticsearch stack** it can drive and screenshot?

For that question the differentiators are not cold-start latency but:

- **Network + disk throughput** — cloning `elastic/kibana` moves gigabytes (`.git` alone is
  ~475 MB packed; a bootstrapped worktree with `node_modules` exceeds 10 GB).
- **Instance sizing** — `yarn kbn bootstrap` and the dev-mode optimizer want 4+ cores / 8+ GB;
  ES + Kibana dev server together want 8 cores / 16 GB. Many providers cap default sandboxes far
  below this.
- **Background processes** — ES and Kibana must keep running *between* exec sessions.
- **Ingress / preview URLs** — port 5601 must be reachable for browser-driven verification.
- **Snapshot / fork / warm resume** — the single biggest lever. A provider that can restore a
  pre-bootstrapped, stack-already-green image in seconds beats one with a 200 ms cold start that
  then spends 40 minutes bootstrapping. Anecdotal internal tests: clone alone costs ~3–4 minutes
  on typical cloud sandboxes; a warm image makes the second interaction near-instant.

## The benchmark ladder

Each level is a self-contained bash task (`tasks/l*.sh`) that emits machine-readable phase
markers. Higher levels subsume lower ones, so per-phase timings stay comparable across levels.

| Level | Name | What it proves | Success criterion | Ceiling | Default N |
|---|---|---|---|---|---|
| L0 | `l0_tti` | Cold start + capability probe (parity with computesdk TTI) | `node`/`git`/`curl` present or installable; probe recorded | 30 s | 20 |
| L1 | `l1_clone` | Network egress + disk write throughput | `git clone` of elastic/kibana; `package.json` present, HEAD resolvable | 10 min | 5 |
| L2 | `l2_bootstrap` | CPU/mem/disk under real dependency install | correct Node from `.node-version`, `yarn kbn bootstrap` exits 0 | 30 min | 3 |
| L3 | `l3_dev_loop` | The agent inner loop: test / type-check / lint one package | all three commands exit 0 | 15 min | 3 |
| L4 | `l4_es_snapshot` | Run Elasticsearch from snapshot (`node scripts/es snapshot`) | ES answers on `:9200` (HTTP 200/401) | 15 min | 3 |
| L5 | `l5_full_stack` | **Flagship:** live Kibana dev server + ES from snapshot | `GET /api/status` → 200 and `/login` served on `:5601` | 45 min | 3 |
| L6 | `warm resume` | Provider snapshot/fork of a green L5 sandbox → stack responsive again | `/api/status` → 200 after resume | 5 min | 5 |

L6 is not a task script — it is a runner mode (`--mode warm`) exercising the provider's
snapshot/resume capability against an L5-green sandbox. Providers without snapshot support score
N/A there, and that absence is itself a headline result.

### Run modes

- `cold` (default) — sequential, fresh sandbox per iteration. Isolated baseline.
- `burst` — M concurrent fresh sandboxes (default 5; keep small — L2+ is expensive). Reveals
  quota/rate-limit behavior on heavy instances, the analogue of computesdk's burst-100 on
  hello-world instances.
- `warm` — provision once to L5-green, snapshot, then N× resume-and-probe. The number platforms
  like an internal "River"-style dev agent actually live and die by.

## Metrics and scoring

Every task prints `##BENCH##` markers; the runner records per-phase wall-clock durations plus
sandbox provision time, and writes one JSON line per iteration to `results/`.

Aggregation (per provider × level, computed by `runner/report.mjs`):

- min / median / avg / P95 / P99 / max of total duration, after trimming the top and bottom 5 %
  of successful iterations (computesdk-style outlier control; only applied when N is large enough
  to trim without emptying the sample).
- **success rate** — iterations meeting the level's success criterion within its ceiling.
- **level score (0–100)** = `(0.60·norm(median) + 0.25·norm(P95) + 0.15·norm(P99)) · successRate`,
  where `norm(x) = max(0, 1 − x/ceiling) · 100`, with the per-level ceilings from the table above.
- **overall score** = weighted sum: L5 35 %, L6 20 %, L2 15 %, L1 10 %, L4 10 %, L3 5 %, L0 5 %.
  The weighting is deliberately opinionated: a provider is judged mostly by whether it can hold a
  live stack and come back warm.
- **cost-to-green** = provider $/hour × median L5 duration — the practical "what does one live
  Kibana cost me" number (fill hourly rates into your config).

Per-phase medians (clone vs toolchain vs bootstrap vs es_ready vs kibana_available) are reported
separately so regressions can be attributed: a slow L5 median might be network (clone), CPU
(optimizer), or scheduler (provision) — the phases disambiguate.

### Capability matrix

L0 auto-probes and records per sandbox: vCPUs, memory, free disk, sudo, outbound network,
node/git availability. Combine with manual columns per provider: max instance size, preview-URL
support, background-process persistence, snapshot/fork, idle-timeout policy, region availability,
$/hour. The matrix often decides a provider before a single timing does.

## Sandbox sizing prerequisites

| Level | vCPU | RAM | Disk |
|---|---|---|---|
| L0–L1 | 2 | 4 GB | 20 GB |
| L2–L3 | 4 | 8 GB | 30 GB |
| L4–L6 | 8 | 16 GB | 40 GB |

Run each level on the *same* spec across providers or the comparison is meaningless. If a provider
cannot allocate the L4+ spec, record it as unsupported rather than benchmarking a swap-thrashing
sandbox.

### Reference timings (single iterations, 4 vCPU / 16 GB container)

Measured with this harness on one sandbox-grade container (`local` adapter, shallow clone from a
local mirror, test-binary downloads skipped — treat as order-of-magnitude anchors, not results):

| Phase | Cold caches | Warm yarn + page cache |
|---|---|---|
| clone (shallow, 1.8 GB worktree) | ~25–65 s at local disk speed; +3–4 min typical over cloud egress | same |
| toolchain (nvm + Node + yarn) | ~12 s | ~1.5 s |
| `yarn kbn bootstrap` | ~15–17 min | **~5.5 min** |
| resulting `node_modules` | 3.3 GB | — |

The cold/warm bootstrap gap is the headline: cache persistence (provider cache volumes, pre-baked
images) buys roughly 3× on L2. A fast developer laptop (10+ cores, NVMe, warm caches) lands under
5 minutes — sandbox-grade hardware does not, even warm.

### Sandbox image checklist (failure modes found the hard way)

Every one of these produced a real L2 failure during harness bring-up; a provider image must
handle all of them before timings mean anything:

- **A non-root user.** Kibana tooling refuses root without `--allow-root`; Elasticsearch refuses
  root with no override. The harness auto-drops to an unprivileged user, but images that only
  offer root shells pay for user setup on every run.
- **nvm is incompatible with `set -e`** (exits 3 when sourced/used under errexit) — relevant to
  any provisioning script, not just this harness.
- **Egress to build-time hosts**: `github.com`, `registry.npmjs.org`, `nodejs.org`,
  `cdn.playwright.dev` (the `playwright install` CLI ignores `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` —
  that var only guards npm postinstall), Chrome-for-Testing endpoints (chromedriver), and
  `download.cypress.io`. Restricted-egress sandboxes need `CHROMEDRIVER_SKIP_DOWNLOAD=true`,
  `CYPRESS_INSTALL_BINARY=0`, `GECKODRIVER_SKIP_DOWNLOAD=true`, and a pre-seeded
  `PLAYWRIGHT_BROWSERS_PATH` (world-readable, or owned by the task user).
- **CA bundles and proxy env must survive the root→user switch**: corporate/proxied sandboxes
  that keep the CA bundle under `/root` break every TLS download for the unprivileged user.

## Harness architecture

```
sandbox_bench/
├── README.md                  ← you are here
├── bench.config.example.json  ← specs, weights, provider settings
├── tasks/                     ← provider-agnostic bash tasks (uploaded + exec'd in the sandbox)
│   ├── lib.sh                 ← phase markers, wait_for_http, repo/toolchain helpers
│   └── l0…l5_*.sh
├── runner/
│   ├── run.mjs                ← orchestrator (zero-dependency Node ≥ 20)
│   ├── report.mjs             ← stats, scores, markdown report
│   └── providers/             ← adapters: create / exec / destroy (+ snapshot / resume)
│       ├── local.mjs          ← host exec, no isolation — harness development only
│       ├── docker.mjs         ← reference adapter incl. snapshot via `docker commit`
│       └── computesdk.mjs     ← any ComputeSDK-backed provider (e2b, Daytona, Modal, …)
└── results/                   ← JSONL, one line per iteration (gitignored)
```

**Marker protocol.** Tasks are plain bash and know nothing about providers. They emit:

```
##BENCH## phase=<name> t=<epoch_millis>     # phase boundary
##BENCH## kv <key>=<value>                  # metadata (git head, repo size, node version…)
##BENCH## fail reason=<slug>                # explicit failure
```

The runner prepends `tasks/lib.sh` and an env preamble to the task script, ships the result as a
single `bash -c` payload, and parses markers from stdout. An adapter therefore needs only three
methods (plus two optional ones):

```js
export const capabilities = { snapshot: boolean };
export async function create(spec /* {cpus, memGb, diskGb, image} */) → handle
export async function exec(handle, script, { timeoutMs }) → { exitCode, stdout, stderr }
export async function destroy(handle)
export async function snapshot(handle) → snapshotId   // optional, enables --mode warm
export async function resume(snapshotId) → handle     // optional, enables --mode warm
```

## Usage

```bash
# Smoke-test the harness on the host (no isolation):
node sandbox_bench/runner/run.mjs --provider local --level l0 --iterations 2

# Real run against docker at the L2 spec:
node sandbox_bench/runner/run.mjs --provider docker --level l2 --iterations 3 \
  --config sandbox_bench/bench.config.example.json

# Flagship + warm resume:
node sandbox_bench/runner/run.mjs --provider docker --level l5 --iterations 3
node sandbox_bench/runner/run.mjs --provider docker --level l5 --mode warm --iterations 5

# Burst mode (concurrency instead of iterations):
node sandbox_bench/runner/run.mjs --provider docker --level l1 --mode burst --concurrency 5

# Aggregate everything in results/ into a markdown report:
node sandbox_bench/runner/report.mjs
```

Environment knobs consumed by the tasks (set via config `env` or the CLI):

- `KIBANA_REPO` (default `https://github.com/elastic/kibana.git`)
- `KIBANA_REF` (default `main`)
- `CLONE_MODE` — `shallow` (default, `--depth 1 --single-branch`), `treeless`
  (`--filter=tree:0`), or `full`. Report which mode a number came from; they differ by gigabytes.
- `KIBANA_DIR` (default `$HOME/kibana`)

## Roadmap

- Nightly scheduled runs (Buildkite or GitHub Actions) publishing trend charts, computesdk-style.
- Adapters for the providers under active internal evaluation (GCP, Modal, AWS microVMs,
  Namespace, Kubernetes agent-sandbox) — each is ~50 lines against the interface above.
- An L7 "agent in the loop" scenario: run a coding agent inside the sandbox against a scripted
  bug-fix task with the live stack, measuring end-to-end task latency rather than infra phases.
- Browser verification phase in L5 (screenshot `/login` via headless Chromium) once a common
  image with Chromium is settled — the `.devcontainer/Dockerfile` in this repo is a ready
  golden-image recipe (nvm + pinned Node + yarn + Chromium).
