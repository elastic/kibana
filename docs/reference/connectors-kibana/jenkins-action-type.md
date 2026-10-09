---
navigation_title: "Jenkins"
type: reference
description: "Use the Jenkins connector to trigger, monitor, and stop Jenkins builds, and to manage jobs, test reports, and the build queue."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Jenkins connector [jenkins-action-type]

The Jenkins connector calls the [Jenkins Remote Access API](https://www.jenkins.io/doc/book/using/remote-access-api/) so a workflow or agent can trigger a build, follow it to completion, gather evidence (console log, test report), and mitigate a bad job (stop, disable, quiet-down) — all without opening the Jenkins UI. It authenticates with a Jenkins username and API token, and every action runs under that account.

Jenkins is self-hosted, so the target Jenkins controller must be network-reachable from {{kib}}.

::::{warning}
This connector can perform any operation the configured account is authorized for, including triggering and stopping builds, disabling and enabling jobs, and freezing the whole instance with quiet-down. There are no additional restrictions in {{kib}} beyond a small set of blocked endpoints (the Groovy script console, the credentials store, security realm configuration, the plugin manager, and instance restart) — access is otherwise governed entirely by the account's Jenkins permissions. Prefer an account scoped to the jobs it needs to manage.
::::

## Create connectors in {{kib}} [define-jenkins-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [jenkins-connector-configuration]

Jenkins connectors have the following configuration properties:

Jenkins URL
:   The base URL of the Jenkins controller, for example `https://jenkins.example.com`. This host must be permitted by the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting.

### Authentication [jenkins-connector-authentication]

**Username and API token**

Username
:   The Jenkins account username that every connector action runs as.

API token
:   A Jenkins API token for that account (not the account password). The connector sends `username:token` as HTTP Basic authentication. Using an API token instead of the password matters: Jenkins exempts API-token-authenticated requests from CSRF crumb checks, while password authentication does not — this connector does not send a crumb, so password authentication is rejected as a CSRF failure on `POST` actions (trigger, stop, disable/enable, quiet-down).

## Test connectors [jenkins-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test calls the Jenkins `whoAmI` API (`GET /whoAmI/api/json`) to verify connectivity and that the credentials resolve to an authenticated (non-anonymous) user.

## Connector actions [jenkins-connector-actions]

The Jenkins connector has the following actions:

`request`
:   Make an authenticated request to any Jenkins API path. Prefer the typed actions below when they fit. The Groovy script console, credentials store, security realm configuration, plugin manager, and instance restart endpoints are blocked.
    - `method` (required): One of `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
    - `path` (required): The API path, for example `/job/my-job/config.xml`.
    - `query` (optional): Query parameters.
    - `body` (optional): Request body for `POST`/`PUT`/`PATCH`.

`triggerBuild`
:   Trigger a build of an unparameterized job (`jobName`). Returns a queue item id and URL — not a build number yet, since Jenkins queues the build first.

`triggerBuildWithParameters`
:   Trigger a build of a parameterized job (`jobName`, `parameters`). `parameters` is a map of build parameter names to string values. Returns a queue item id and URL, like `triggerBuild`.

`getQueueItem`
:   Resolve a queue item (`queueId`, from a trigger action) to its eventual build. Returns `build.number` once Jenkins has started the build, or `blocked`/`why` while it is still waiting.

`getBuild`
:   Read a specific build of a job (`jobName`, `buildNumber`): result, whether it is still building, timestamp, and duration.

`getConsoleLog`
:   Fetch the console output of a build (`jobName`, `buildNumber`). Output is capped to the last 20,000 characters.

`stopBuild`
:   Abort a running build (`jobName`, `buildNumber`).

`getLastBuild`
:   Read the most recent build of a job (`jobName`) — a quick pipeline health check without knowing the build number.

`listJobs`
:   List the jobs on the instance with name, URL, and last-build status.

`getJob`
:   Read a single job (`jobName`): description, status, last/lastSuccessful/lastFailed build pointers, and its build parameter definitions.

`listBuilds`
:   List recent builds of a job (`jobName`, optional `limit`, default 20, max 100).

`getBuildTestReport`
:   Read the parsed test report for a build (`jobName`, `buildNumber`): pass/fail/skip counts and up to 50 failing test cases. Throws if the build has no test report.

`disableJob`
:   Disable a job (`jobName`) so no new builds start for it.

`enableJob`
:   Re-enable a previously disabled job (`jobName`).

`getQueue`
:   Read the full Jenkins build queue.

`quietDown`
:   Put the whole instance in quiet-down mode: no new builds start across any job. A heavy, instance-wide mitigation — prefer `disableJob` for a single misbehaving job.

`cancelQuietDown`
:   Cancel quiet-down mode so builds can start again across the instance.

::::{note}
This connector targets top-level jobs. Jobs nested in folders (via the Folders plugin) are not supported.
::::

## Connector networking configuration [jenkins-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. Make sure the Jenkins URL is permitted by `xpack.actions.allowedHosts`.

## Get API credentials [jenkins-api-credentials]

1. Sign in to Jenkins as the account you want the connector to use (create a dedicated service account if you want to scope access to specific jobs).
2. Click your username in the top-right corner, then **Security**.
3. Under **API Token**, click **Add new Token**, give it a name, then click **Generate**.
4. Copy the generated token immediately — Jenkins only shows it once.
5. Enter the Jenkins URL, the account's username, and the API token when configuring the connector in {{kib}}.
