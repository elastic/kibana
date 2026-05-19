# FTR test failure guidance

## Failure artifacts

When an FTR test fails, the test runner writes diagnostic artifacts that Buildkite uploads. **A single content `<hash>` links every artifact for one failure.**

### What to download (main CI: `kibana-pull-request`, `kibana-on-merge`)

| Artifact           | Path                                                           | What's in it                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structured record  | `target/test_failures/<jobId>_<hash>.{json,log,html}`          | Test name, classname, owners, error, full test-runner stdout (incl. interleaved Kibana / ES server logs as `proc [kibana] [...]` lines), `commandLine` to repro, link to the existing `failed-test` issue (`githubIssue`), `failureCount`. **Start here.** `.json` is source of truth; `.log` is a human summary; `.html` is the rendered annotation. |
| Failure screenshot | `<test-root>/screenshots/failure/<title-truncated>-<hash>.png` | Viewport at failure. UI tests only.                                                                                                                                                                                                                                                                                                                   |
| DOM snapshot       | `<test-root>/failure_debug/html/<title-truncated>-<hash>.html` | Full DOM at failure. UI tests only.                                                                                                                                                                                                                                                                                                                   |
| Elasticsearch logs | `.es/*.log`                                                    | When the failure looks transport / cluster related.                                                                                                                                                                                                                                                                                                   |

`<test-root>` is the FTR config's root (e.g. `src/platform/test/functional/`, `x-pack/platform/test/serverless/shared/`). The exact screenshot path is logged in `system-out` (`info Taking window screenshot "..."`). There is no separate `kibana.log` — Kibana output is in the `.json` record's `system-out` field. `target/test_failures/` is shared with Scout; filter by `.jobName` (e.g. `FTR Configs #90` vs `Scout Lane #12`) to keep only FTR.

### How to retrieve

`bk artifacts download` takes an artifact ID, not a glob, so the standard recipe is **list → filter by path → download by ID**. Use `bk` (never `curl` with a token). Replace `<hash>` with the content hash from the `failed-test` issue / the `.json` record:

```sh
# 1. List artifacts for the failing FTR job, filter the three useful paths, capture IDs:
bk artifacts list <build> -p <pipeline> --job-uuid <jobId> --output json \
  | jq -r --arg h "<hash>" '.[] | select(
      (.path | test("target/test_failures/.+_" + $h + "\\.json$"))
      or (.path | test("screenshots/failure/.*" + $h + ".*\\.png$"))
      or (.path | test("failure_debug/html/.*" + $h + ".*\\.html$"))
    ) | .id' \
  > /tmp/ftr-artifact-ids.txt

# 2. Download each ID (files land at their original path under ./):
xargs -I{} bk artifacts download {} --build <build> -p <pipeline> < /tmp/ftr-artifact-ids.txt
```

The `.json` record is the source of truth — pull it first, then use its `system-out` (Kibana stdout) and the resolved `<hash>` to fetch the screenshot and DOM only if the failure is UI-side.

### Cloud pipelines

Different layout: one self-contained HTML per failure at `<config-path-with-underscores>-<unix-timestamp>/html/<contentHash>.html`. Contains the same test title / command / owners / error / `system-out` as the main-CI `.html`, but **no** `target/test_failures/`, **no** separate screenshot / DOM artifacts. Use the HTML directly.
