---
navigation_title: "Ansible Control Server"
type: reference
description: "Use the Ansible Control Server connector to launch and monitor Ansible Automation Controller / AWX jobs."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Ansible Control Server connector [ansible-controller-action-type]

The Ansible Control Server connector calls the [Ansible Automation Controller / AWX API](https://docs.ansible.com/automation-controller/latest/html/controllerapi/index.html) to list job templates, launch jobs, and diagnose failures via stdout and job events. It authenticates with a long-lived API bearer token and can verify the server TLS certificate against a pasted PEM CA.

::::{warning}
This connector can perform any operation the configured token is authorized for, including launching jobs that mutate real infrastructure. There are no additional restrictions in {{kib}}: access is governed entirely by the token's Controller / AWX permissions. Prefer a least-privilege automation user scoped to specific templates and organizations.
::::

## Create connectors in {{kib}} [define-ansible-controller-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [ansible-controller-connector-configuration]

Ansible Control Server connectors have the following configuration properties:

API server URL
:   The base URL of the Controller / AWX server, for example `https://controller.example.com`. This host must be permitted by the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting.

API base path
:   API root path prepended to typed actions. Use `/api/v2` for AWX, Tower, and AAP ≤2.4. Use `/api/controller/v2` for AAP 2.5+ platform gateway installs. Default: `/api/v2`.

### Authentication [ansible-controller-connector-authentication]

**API token**

Token
:   A long-lived personal access token (PAT) or OAuth2 application token. The connector sends it in the `Authorization: Bearer <token>` header. Do **not** paste short-lived session cookies.

Server CA certificate (PEM)
:   Optional PEM-encoded certificate authority used to verify the server certificate.

Verification mode
:   How to verify the server TLS certificate: `full` (default), `certificate`, or `none` (not recommended).

## Test connectors [ansible-controller-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test requests the authenticated user (`GET …/me/`) to verify connectivity and authentication.

The connector has the following actions:

`request`
:   Make an authenticated request to any Controller / AWX API path. Prefer typed actions when they fit.

`listJobTemplates` / `getJobTemplate` / `getJobTemplateLaunchOptions`
:   Discover templates and launch-time prompts (`ask_*`, survey defaults).

`launchJobTemplate`
:   Launch a job (`extra_vars`, `limit`, `inventory`, credentials, tags, and so on). Mutates infrastructure.

`listJobs` / `getJob` / `getJobStdout` / `listJobEvents` / `cancelJob`
:   Monitor and diagnose job runs. Stdout is capped for agent-safe context size.

`listInventories` / `listHosts` / `listProjects` / `getMe`
:   Inventory, host, project, and identity reads. Credential secret fields are scrubbed.

## Get API credentials [ansible-controller-api-credentials]

1. In Controller / AWX, create a dedicated automation user with execute permissions on the job templates the connector should use.
2. Create a personal access token for that user (User → Tokens), or an OAuth2 application token.
3. If the server uses a private CA, retrieve the CA certificate as PEM.
4. Enter the API server URL, API base path, token, and optional CA when configuring the connector in {{kib}}.
