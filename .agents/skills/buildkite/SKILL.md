---
name: buildkite
description: Interact with Buildkite CI via the bk CLI
---

# Buildkite (bk CLI)

## View a build and its jobs:
bk build view <build-number> -p <pipeline>          # e.g. -p kibana-pull-request
bk build view <build-number> -p <pipeline> -o json  # structured output

# Stream a job's log:
bk job log <job-id> -p <pipeline> -b <build-number>

## List recent builds on a branch:
bk build list -p <pipeline> -b <branch> --limit 3

## Common pipelines: kibana-pull-request, kibana-on-merge