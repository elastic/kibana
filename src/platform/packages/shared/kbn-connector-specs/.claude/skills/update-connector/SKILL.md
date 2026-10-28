---
name: update-connector
description: Updates an existing connector after its vendor's API changed, typically for a `connector-validation` drift issue. Reproduces the drift, fixes the connector, refreshes its vendor_api artifacts and opens a draft PR. Use when asked to fix a vendor API drift issue, follow a vendor API change, or refresh a connector's vendor API artifacts.
allowed-tools: WebFetch, WebSearch, Read, Grep, Glob, Write, Edit, Bash, Skill
argument-hint: [connector-id] [drift issue number or URL]
---

# Update a Connector for a Vendor API Change

We're going to bring the **$0** connector in line with its vendor's latest API, for drift issue **$1** if
one was given.

The weekly drift check (`kibana / connector vendor API drift` on Buildkite) compares each connector's
committed `vendor_api/` artifacts with the vendor's latest specs. Changes that need no edit to the
connector are refreshed in its bot PR. What it files as an issue needs a decision: a new limit to respect,
a response that can now hold more than the connector expects, an operation that moved or is going away.
Make the smallest change that handles it, and leave the rest of the connector alone.

## Step 1: Reproduce

Read the issue if there is one (`gh issue view <number>`), then run the check yourself. The issue shows
the findings of the run that filed or last updated it, so the vendor may have changed again since:

```bash
node scripts/connector_vendor_api --drift --connector $0 --report target/connector_vendor_api/drift.json
```

The check classifies spec changes with `oasdiff` (`OASDIFF_BIN`, else `oasdiff` on the `PATH`). Without
it, every changed spec shows up as unclassified; install a [release](https://github.com/oasdiff/oasdiff/releases)
first. The connector's entry in the report has:

- `verdict`: the two-mock result. `healthy` (the actions pass against the committed snapshots and the
  latest specs), `vendor-drift` (they pass against the snapshots, not against the latest specs),
  `kibana-regression` (they fail against the snapshots already) or `unknown` (a latest spec didn't load).
- `sources`: per spec in `manifest.json`, `unchanged`, `unreachable` with the `error`, or `changed` with
  the `changes`, each `breaking`, `deprecation` or `non-breaking`, with `oasdiff`'s rule `id`, its
  `text` and the `operation`. Snapshots only hold the operations the actions call, so every change is to
  one of them.
- `snapshotProblems` and `latestProblems`: what recording the actions reported against each.
- `overlayFindings`: actions in `overlay.yaml` that no longer apply to the latest specs.
- `outcome`: `none` and `refresh` need no work here. Say so on the issue and stop: the pipeline closes
  the issue on its next run, and refreshes in its bot PR.

## Step 2: Fix What the Check Found

Work through the findings in this order; a later one often goes away with an earlier fix.

### `kibana-regression`: the connector fails against its committed snapshots

Something on the Kibana side broke it, not the vendor (unless you just changed `overlay.yaml`, which
applies to the snapshots too: see "A request-side change" below). Don't refresh. Reproduce offline with
`node scripts/connector_vendor_api --connector $0 --check`, find the change that caused it
(`git log -- <connector folder>` and the shared code it imports), and fix the connector. A recent PR
that changed the connector without rerunning the recording is the usual cause.

### Unreachable or `unknown`: a spec didn't load

The vendor moved or stopped publishing the spec. Find the current URL on the vendor's docs or in its
own repository (the source rules in `review-connector`'s "Vendor API Artifacts" apply), then move the
source, keeping its name:

```bash
node scripts/connector_vendor_api --connector $0 --source <name>=<new url>
```

If the vendor no longer publishes any spec, stop and say so on the issue. Existing connectors can't be
added to `vendor_api_exemptions.json`, so that needs a decision from the owning team.

### `vendor-drift`: the actions break the latest spec

Each entry in `latestProblems` names the action, the request it sent and what the latest spec rejects.
Fix the connector so it sends what the vendor now accepts, as in `create-connector`'s "Fix every problem
it reports" (`create-connector/SKILL.md`, "Record the vendor API contract"):

- a tightened limit (*exceeds maximum*, *String is too long*): tighten the input schema's `.max()` to the
  vendor's new limit, and state the limit in the parameter's `.describe()`;
- a parameter, property or path renamed, moved or removed: follow it in the handler, using the vendor's
  changelog or docs to confirm the replacement;
- a new required parameter: add it to the request, from the action's input or a sensible default the
  vendor documents.

Read the vendor's changelog for the change before writing code: a limit that changed in the spec may be
a spec error rather than an API change. If the docs and the real API disagree with the spec, correct the
spec with an overlay action that states its evidence instead (`create-connector`, "Correct the spec with
an overlay, with evidence"). Never loosen the spec to make an action pass without that evidence.

### Breaking or deprecated changes, while the actions pass

The recordings pass, but don't stop there. Decide per change:

- **A request-side change** (a new or lower limit, a new required parameter, a narrower type): the
  recordings send every input at its bounds, so passing means the connector doesn't send that part the
  way the spec places it. Usually an action in `overlay.yaml` documents where the connector really sends
  it, such as a form body instead of the query, and that copy doesn't carry the vendor's new constraint,
  while the real API enforces it wherever the value is sent. Copy the constraint into the overlay's
  version, with the vendor's spec as its evidence in `description`, and rerun the check. The action now
  fails at its bound, against the latest spec and against the committed snapshot too, since the overlay
  applies to both, so the verdict reads `kibana-regression`. Fix it as vendor drift, above. Without an overlay involved, check whether the connector sends
  the parameter at all; if it doesn't, nothing needs to change.

- **A response that can hold more** (a new enum value, a new `oneOf` variant, a new `null`, a longer
  string): find where the connector reads the field (`grep` the handler, its helpers and the action's
  `output` schema). If it only passes the response through, nothing needs to change. If it branches on
  the value, maps it, or validates it with a `z.enum` or a non-nullable type, handle the new value or
  widen the schema.
- **A deprecation or sunset** of an operation or parameter the connector uses: find the replacement in
  the vendor's docs. Migrate the action when the vendor announced a removal date; otherwise note the
  replacement in the PR and on the issue, and leave the action as it is.
- **A removed response property** the connector reads: stop reading it, or read its replacement.

### Stale overlay actions

Each entry in `overlayFindings` names an `overlay.yaml` action (by its index) whose target matches
nothing in the latest specs. Either the vendor fixed the spec, so remove the action if the latest spec
now says what the overlay said, or the vendor moved the operation, so retarget the action, keeping its
evidence in `description`.

## Step 3: Refresh the Artifacts

```bash
node scripts/connector_vendor_api --connector $0 --refresh
```

This fetches the latest specs and records the actions against them. Fix every problem it reports and
rerun it until it reports none. Then review `git diff -- <connector folder>/vendor_api` as a reviewer
would, with `review-connector`'s "Vendor API Artifacts" checklist: the snapshot diff should show the
vendor's changes from Step 1, and operations added to or removed from `manifest.json` should match your
handler changes.

## Step 4: Verify

Run each check and fix every failure for this connector:

```bash
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/connector_spec_vendor_api_contract.test.ts
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/connector_spec_quality_contract.test.ts
node scripts/jest <connector folder>
node scripts/type_check --project src/platform/packages/shared/kbn-connector-specs/tsconfig.json
node scripts/connector_vendor_api --drift --connector $0
```

The last one should now report `none (healthy)`. Anything else means a finding from Step 1 is left.

If the change affects what users see (a new limit on an input, an action that behaves differently, a
migrated action), update the action's `.describe()` text, its `skill` content and the connector's docs
page to match (`create-connector`, Steps 3 and 5).

Then review the whole diff once with the `review-connector` checklist, the "Vendor API Artifacts",
"Vendor API Correctness" and "Tests" sections at least. Add a unit test for any handler change, such as
the new enum value or the renamed parameter.

## Step 5: Open a Draft PR

Commit on a new branch with the repository's commit message convention, then open a draft PR:

- Title: `[Connectors][<Connector name>] Follow <vendor> API changes`, or what the change is when it is
  one thing (`Bound Firecrawl scrape waitFor to 60 seconds`).
- Body:
  - A summary that links the issue (`Closes #<issue>`), and one line per finding from Step 1: what the
    vendor changed, what it meant for the connector, and what you did (or why nothing was needed).
  - The `## Validated` section from `create-connector/reference/pr-validation-table.md`, with the vendor
    API contract line, the sources and API versions recorded against, and a row for every action. Mark
    actions you didn't exercise against the real service `⚠️ Not validated — needs manual verification`;
    a refresh tested only against the mocks doesn't count as live validation.
- Labels: `Feature:Actions/ConnectorTypes`, the owning team's label from the issue, and
  `release_note:fix` when users see a difference, otherwise `release_note:skip`.

Comment on the issue with a link to the PR. Leave the issue open: the PR closes it when it merges, and
the drift check reopens it if the connector drifts again.

## Important Notes

- The drift check, not the issue, is the source of truth; rerun it after every fix.
- Don't refresh away a `kibana-regression` or `vendor-drift` without fixing the connector; the refresh
  reports the same problems anyway.
- Keep the change to what the vendor changed. Improvements the update made you notice belong in a
  separate PR.
