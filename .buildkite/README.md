# Kibana / Buildkite

## Directory Structure

- `hooks` - special directory used by Buildkite agents for [hooks](https://buildkite.com/docs/agent/v3/hooks)
- `pipeline-utils` - Shared TypeScript utils for use in pipeline scripts
- `pipelines` - contains pipeline definitions
- `scripts/common` - scripts that get `source`d by other scripts to set environment variables or import shared functions
- `scripts/lifecycle` - general scripts for tasks that run before or after individual steps or the entire build
- `scripts/steps` - scripts that define something that will run for a step defined in a pipeline
- `scripts/*` - all other scripts are building blocks that make up the tasks in pipelines. They may be run by other scripts, but should not be `source`d
