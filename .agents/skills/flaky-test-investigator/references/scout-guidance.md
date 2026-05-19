## Scout test failure guidance

When investigating a Scout failure, weight these checks higher:

- **Lane pollution.** Scout tests in the same Playwright lane share servers (see "How tests are distributed across servers"). Look at which other configs ran in the same lane in the failing build. If the same neighbor configs appear repeatedly in failing builds, suspect cross-test state leakage.
- **Worker load on shared servers (parallel configs).** Scout configs that opt in to parallelism (typically named `parallel.playwright.config.ts` and passing `workers > 1`) run multiple Playwright workers against the same Kibana/Elasticsearch test servers. Under load, this can manifest as slow responses, occasional timeouts, or transient errors that look test-specific but are really resource pressure. Worth keeping in mind when interpreting timeout-shaped failures in a parallel config — it is _not_ by itself a reason to drop `workers` back to 1. Consider it especially when the same test passes in isolation but flakes only in the full parallel run.
- **Poll/timeout values.** Bumping a Scout poll timeout is a frequent and frequently-recurring fix. Before recommending one, confirm the slow operation is intrinsic to the product (e.g. index creation, SLO calculation) rather than a missing `waitForResponse` or `waitForSelector` somewhere upstream.

## Failure artifacts (Scout)

Scout uses a custom Playwright reporter (`@kbn/scout-reporting`) that produces self-contained HTML reports per failure with the screenshot embedded. The standard Playwright outputs (`playwright-report/index.html`, `trace.zip`, video) are NOT what Scout publishes.

### What to download

| Artifact          | Path                                                                                  | What's in it                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-run index     | `.scout/reports/scout-playwright-test-failures-<runId>/test-failures-summary.json`    | Array of `{ name, htmlReportFilename }`. **Start here** to map a failing test name to its HTML report.                                                                                                            |
| Per-failure HTML  | `.scout/reports/scout-playwright-test-failures-<runId>/<testId>.html`                 | Self-contained: test details, command, error stack, stdout, **embedded screenshot** (base64). For most investigations this is enough.                                                                             |
| Structured NDJSON | `.scout/reports/scout-playwright-test-failures-<runId>/scout-failures-<runId>.ndjson` | One JSON record per failure: `id` (= `<testId>`), `owner`, `target`, `command`, `kibanaModule`, `location`, `suite`, `title`, `error.message` / `error.stack_trace`. **Use this for programmatic investigation.** |
| Separate PNG      | `**/.scout/test-artifacts/<test-slug-with-target>/test-failed-<N>.png`                | Playwright's default per-test screenshot. Nested under per-plugin test roots (the `**/` prefix is required). `<N>` is the attempt number — retries produce multiple PNGs.                                         |

`<testId>` (e.g. `3ff6decf4c25127-b92795356361dc9`) appears in **both** the HTML filename and the NDJSON `id`. The PNG does NOT contain `<testId>`; correlate via the spec file path (NDJSON's `location` matches the PNG's spec-basename prefix).

### How to retrieve

`bk artifacts download` takes an artifact ID, not a glob, so the standard recipe is **list → filter by path → download by ID**. Always scope to the failed job's UUID (see "Buildkite mechanics" below for why) and use `bk` (never `curl` with a token):

```sh
# 1. List artifacts for the failed job, filter the paths you want, capture the IDs:
bk artifacts list <build> -p <pipeline> --job-uuid <jobId> --output json \
  | jq -r '.[] | select(.path | test("scout-playwright-test-failures-.*/(test-failures-summary\\.json|scout-failures-.*\\.ndjson|.+\\.html)$") or test("\\.scout/test-artifacts/.+/test-failed-.+\\.png$")) | .id' \
  > /tmp/scout-artifact-ids.txt

# 2. Download each ID (files land at their original path under ./):
xargs -I{} bk artifacts download {} --build <build> -p <pipeline> < /tmp/scout-artifact-ids.txt
```

If you don't need to be selective and the job is small, `bk artifacts download --build <build> -p <pipeline> --job-uuid <jobId>` pulls every artifact from that job into `artifacts-build-<build>/`.

## Buildkite mechanics for Scout failures

Four sharp edges to be aware of when investigating a Scout failure via Buildkite. Skipping any of them frequently leads to wrong conclusions like "no screenshot was uploaded" or "no lane neighbors to look at". Always use the `bk` CLI (`bk api`, `bk artifacts ...`) rather than calling `api.buildkite.com` directly with a token — see the parent `SKILL.md` for the rationale.

### 1. Failed-attempt jobs are hidden by default

`/builds/<n>` returns only the most recent attempt for each step. If a job failed and a retry passed, the original failing job UUID — the one cited in `failed-test` issue comments — looks "not found". Always append `?include_retried_jobs=true`:

```sh
bk api "/organizations/elastic/pipelines/<pipeline>/builds/<n>?include_retried_jobs=true"
```

On the original job object, `retried: true` and `retried_in_job_id: <new-uuid>` link the two.

### 2. Per-job artifacts live on a different endpoint than build-wide artifacts

The build-level artifact listing only returns artifacts from the _latest_ attempt for each step. The screenshot, Scout HTML, and NDJSON from a failed attempt live on the _job-level_ listing and are only reachable if you know the failed job's UUID:

```sh
bk artifacts list <n> -p <pipeline> --job-uuid <jobId>
```

If a build retried to green, the failure artifacts are _only_ on the failed job's endpoint. Do not conclude "no screenshot uploaded" until you've checked there.

### 3. Lane composition is in a separate "Scout Test Run Builder" artifact

Job names like `Scout Lane #4 - stateful-classic / default` tell you the lane number, arch, and server-config set, but not which Playwright configs were packed into that lane. That mapping is computed once per build by a step named `Scout Test Run Builder` (`step_key: build_scout_tests`) and uploaded as a single artifact:

```
.scout/test_lane_loads.json
```

Top-level keys are `scout_test_lane_<n>`; values are the list of Playwright config paths sharing the same Kibana/Elasticsearch test servers in that lane. To map a failing job to its neighbors:

1. From the failing job: read `step_key` (e.g. `scout_test_lane_4`).
2. Find the build's `Scout Test Run Builder` job; download `test_lane_loads.json` from its artifacts.
3. Look up the same key.

### 4. Same lane number, different physical lane per (arch, server-config set)

`scout_test_lane_4` in `test_lane_loads.json` is one list, but at runtime that list is scheduled separately for each `<arch> / <server-config>` combination (stateful-classic / default, serverless-search / default, etc.). The job's `name` ("Scout Lane #4 - stateful-classic / default") disambiguates which physical lane the failure happened on. Suspect lane pollution only when the same neighbor configs _and_ the same arch/server-config combination recur across multiple failing builds.
