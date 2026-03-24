---
name: buildkite-logs
description: >-
  Fetch and analyse Buildkite CI logs for the elastic/kibana repo. Provides
  helpers to retrieve build/job logs by build number or PR number, summarise
  failures, and inspect artifacts. Use when the user asks about CI failures,
  Buildkite logs, a failing build, a red CI, build artifacts, or mentions a
  Buildkite URL or PR number in the context of CI.
---

# Buildkite Logs

## Authentication

All requests require `BUILDKITE_API_TOKEN`. The token is read-only for most
operations; a read-write token is needed to trigger retries.

```bash
# Check for token
if [ -z "$BUILDKITE_API_TOKEN" ]; then
  echo "Set BUILDKITE_API_TOKEN before proceeding."
  exit 1
fi
BK_AUTH="Authorization: Bearer $BUILDKITE_API_TOKEN"
ORG="elastic"
PIPELINE="kibana-pull-request"
BASE="https://api.buildkite.com/v2"
```

If the token is missing, ask the user to export it:
> You can create a token at https://buildkite.com/user/api-access-tokens (scope: read_builds, read_artifacts).

---

## Fetch build by number

```bash
BUILD_NUMBER=<number>
curl -sf -H "$BK_AUTH" \
  "$BASE/organizations/$ORG/pipelines/$PIPELINE/builds/$BUILD_NUMBER" \
  | jq '{number,state,branch,commit,created_at,web_url,jobs:[.jobs[]|{id,name,state,exit_status,web_url}]}'
```

To get a build number from a Buildkite URL like
`https://buildkite.com/elastic/kibana-pull-request/builds/414685`, extract `414685`.

---

## Fetch latest build for a PR

```bash
PR=<number>
curl -sf -H "$BK_AUTH" \
  "$BASE/organizations/$ORG/pipelines/$PIPELINE/builds?pull_request_id=$PR&per_page=1" \
  | jq '.[0] | {number,state,branch,web_url,jobs:[.jobs[]|{id,name,state,exit_status}]}'
```

---

## Fetch job log

Once you have a build number and job ID:

```bash
BUILD_NUMBER=<number>
JOB_ID=<uuid>
curl -sf -H "$BK_AUTH" \
  "$BASE/organizations/$ORG/pipelines/$PIPELINE/builds/$BUILD_NUMBER/jobs/$JOB_ID/log" \
  | jq -r '.content'
```

Logs can be large. Pipe through `tail -n 200` or search with `grep`/`rg` for
relevant sections:

```bash
... | jq -r '.content' | grep -A 5 -i "error\|fail\|FAIL\|exception"
```

---

## Workflow: diagnose a failing build

1. **Get build overview** (fetch build by number or PR, see above).
2. **Identify failed jobs**: filter `jobs` where `state == "failed"`.
3. **Fetch log for each failed job** and search for the first error/failure.
4. **Summarise**: report job name, exit code, and the key error lines.

For large logs, focus on the last 200–500 lines plus any lines matching
`error`, `FAIL`, `AssertionError`, `TypeError`, or `✖`.

---

## Workflow: understand job definition for PR build
1. Analyse .buildkite/pipelines/pull_request/base.yml
2. Analyse any relevant yml files in the folder

## List and download artifacts

```bash
BUILD_NUMBER=<number>
# List artifacts for the build
curl -sf -H "$BK_AUTH" \
  "$BASE/organizations/$ORG/pipelines/$PIPELINE/builds/$BUILD_NUMBER/artifacts" \
  | jq '.[] | {id,filename,file_size,download_url}'

# Download a specific artifact
ARTIFACT_ID=<uuid>
curl -sL -H "$BK_AUTH" \
  "$BASE/organizations/$ORG/pipelines/$PIPELINE/builds/$BUILD_NUMBER/artifacts/$ARTIFACT_ID/download" \
  -o <filename>
```

Artifacts for a single job:
```bash
JOB_ID=<uuid>
curl -sf -H "$BK_AUTH" \
  "$BASE/organizations/$ORG/pipelines/$PIPELINE/builds/$BUILD_NUMBER/jobs/$JOB_ID/artifacts" \
  | jq '.[] | {id,filename,file_size,download_url}'
```

---

## Other pipelines

Kibana has multiple pipelines. Common slugs:

| Pipeline | Slug |
|---|---|
| PR | `kibana-pull-request` |
| On-merge | `kibana-on-merge` |
| Flaky test runner | `kibana-flaky-test-suite-runner` |

Substitute the `PIPELINE` variable as needed.
