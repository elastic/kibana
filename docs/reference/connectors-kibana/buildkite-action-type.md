---
navigation_title: "Buildkite"
type: reference
description: "Use the Buildkite connector to trigger, observe, retry, and cancel builds, unblock deploy gates, and post annotations using Buildkite's hosted MCP server."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Buildkite connector [buildkite-action-type]

The Buildkite connector lets a workflow or agent drive a Buildkite CI/CD pipeline without opening the Buildkite console: trigger a build, observe its state, self-heal a failure by retrying failed jobs, stop a bad build, and unblock a manual deploy gate. It also posts findings back onto a build as annotations, and lists jobs, pipelines, and artifacts for triage.

## Overview

This is an **MCP-native connector**. It connects to Buildkite's officially hosted remote MCP server using the API-token pass-through endpoint (`https://mcp.buildkite.com/direct`), rather than calling the Buildkite REST API directly. See the [Buildkite MCP server documentation](https://buildkite.com/docs/apis/mcp-server) for details on the underlying server.

## Create connectors in {{kib}} [define-buildkite-ui]

You can create a Buildkite connector in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [buildkite-connector-configuration]

Organization slug
:   The slug of your Buildkite organization, found in the URL: `buildkite.com/<slug>/`. Every action on this connector runs against this organization.

Authentication
:   Bearer token. Use a Buildkite API access token with the `read_pipelines`, `read_builds`, `write_builds`, `read_artifacts`, and `read_build_logs` scopes.

## Available actions [buildkite-available-actions]

| Action | Description |
|--------|-------------|
| `createBuild` | Trigger a new build on a pipeline for a specific commit and branch. Parameters: `pipelineSlug` (required), `commit` (required), `branch` (required), `message`, `ignoreBranchFilters`, `environment`, `metadata`. |
| `getBuild` | Get a single build's state, timing, and annotation summaries. Parameters: `pipelineSlug` (required), `buildNumber` (required). |
| `listBuilds` | List builds for a pipeline, or across the organization when `pipelineSlug` is omitted. Parameters: `pipelineSlug`, `branch`, `state`, `commit`, `creator`, `page`, `perPage`. |
| `cancelBuild` | Cancel a running or scheduled build. Parameters: `pipelineSlug` (required), `buildNumber` (required). |
| `rebuild` | Rebuild an entire build from the same commit, branch, and environment. Parameters: `pipelineSlug` (required), `buildNumber` (required). |
| `retryFailedJobs` | Retry every failed, broken, or timed-out job in a build, leaving passed jobs alone. Parameters: `pipelineSlug` (required), `buildNumber` (required). |
| `listJobs` | List the jobs in a build, optionally filtered by state. Parameters: `pipelineSlug` (required), `buildNumber` (required), `state`, `perPage`. |
| `unblockJob` | Unblock a blocked (manual-gate) job so the build proceeds. Parameters: `pipelineSlug` (required), `buildNumber` (required), `jobId` (required), `fields`. |
| `retryJob` | Retry a single failed or timed-out job. Parameters: `pipelineSlug` (required), `buildNumber` (required), `jobId` (required). |
| `getJobLog` | Get bounded log output for a job. Parameters: `pipelineSlug` (required), `buildNumber` (required), `jobId` (required), `seek`, `limit` (default 500). |
| `createBuildAnnotation` | Create or append to an annotation shown on the build page. Parameters: `pipelineSlug` (required), `buildNumber` (required), `body` (required), `style`, `context`, `priority`, `append`. |
| `listBuildAnnotations` | List the annotations posted on a build. Parameters: `pipelineSlug` (required), `buildNumber` (required), `page`, `perPage`. |
| `listPipelines` | List the organization's pipelines. Parameters: `name`, `repository`, `page`, `perPage`. |
| `getPipeline` | Get a single pipeline's configuration and metadata. Parameters: `pipelineSlug` (required). |
| `listArtifacts` | List the artifacts a build produced across all of its jobs. Parameters: `pipelineSlug` (required), `buildNumber` (required), `page`, `perPage`. |
| `listTools` | List every MCP tool exposed by the Buildkite MCP server, including ones without a named action above (clusters, agents, pipeline schedules, Test Engine). |
| `callTool` | Call any Buildkite MCP tool directly by name — an escape hatch for tools not covered by a named action, such as downloading an artifact with `get_artifact` or searching logs with `search_logs`. Parameters: `name` (required), `arguments`. |

## Connector networking configuration [buildkite-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [buildkite-api-credentials]

1. Log in to your [Buildkite](https://buildkite.com/) account.
2. Go to **User Settings > API Access Tokens** (`buildkite.com/user/api-access-tokens`) and create a new token.
3. Grant the `read_pipelines`, `read_builds`, `write_builds`, `read_artifacts`, and `read_build_logs` scopes, and restrict the token to the organization you plan to use with this connector.
4. Copy the generated token.
5. When configuring the connector, enter the token as the Bearer token, and enter your organization's slug (from your Buildkite URL, `buildkite.com/<slug>/`) in the **Organization slug** field.
