---
navigation_title: "Ansible Automation Platform"
type: reference
description: "Use the Ansible Automation Platform connector to launch and monitor Ansible Automation jobs."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Ansible Automation Platform connector [ansible-platform-action-type]

The Ansible Automation Platform connector calls the [Ansible Automation Gateway](https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.7/configure-con_gw_open_api_specification) to list job templates, launch jobs, and diagnose failures via stdout and job events. It authenticates with a API bearer token and can verify the server TLS certificate against a pasted PEM CA.

You can use this connector in **Agent Builder** and **Workflows**.

::::{warning}
This connector can perform any operation the configured token is authorized for, including launching jobs that mutate real infrastructure. There are no additional restrictions in {{kib}}: access is governed entirely by the token's platform permissions. Prefer a least-privilege automation user scoped to specific templates and organizations.
::::

## Create connectors in {{kib}} [define-ansible-platform-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [ansible-platform-connector-configuration]

Ansible Platform Server connectors have the following configuration properties:

API server URL
:   Base URL of the AAP platform gateway, e.g. https://aap.example.com. In AAP 2.7, all API traffic must route through the gateway; direct component access
  (controller.example.com, hub.example.com) is removed.

API base path
:   API root path prepended to typed actions. Use /api/v2 for AAP 2.4–2.6 (direct controller access). Use [/api/controller/v2]for AAP 2.7+ where all requests route through the platform gateway. Default: /api/v2.

### Authentication [ansible-platform-connector-authentication]

**API token**

Token
:   A long-lived personal access token (PAT) or OAuth2 application token. The connector sends it in the `Authorization: Bearer <token>` header. Do **not** paste short-lived session cookies.

Server CA certificate (PEM)
:   Optional PEM-encoded certificate authority used to verify the server certificate.

Verification mode
:   How to verify the server TLS certificate: `full` (default), `certificate`, or `none` (not recommended).

## Test connectors [ansible-platform-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test requests the authenticated user (`GET …/me/`) to verify connectivity and authentication.

## Connection actions [ansible-platform-connector-actions]

The connector has the following actions:

`request`
:   Make an authenticated request to any platform gateway API path. Prefer typed actions when they fit.

`listJobTemplates` / `getJobTemplate` / `getJobTemplateLaunchOptions`
:   Discover templates and launch-time prompts (`ask_*`, survey defaults).

`launchJobTemplate`
:   Launch a job (`extra_vars`, `limit`, `inventory`, credentials, tags, and so on). Mutates infrastructure.

`listJobs` / `getJob` / `getJobStdout` / `listJobEvents` / `cancelJob`
:   Monitor and diagnose job runs. Stdout is capped for agent-safe context size.

`listInventories` / `listHosts` / `listProjects` / `getMe`
:   Inventory, host, project, and identity reads. Credential secret fields are scrubbed.

## Get API credentials [ansible-platform-api-credentials]

1. In platform, create a dedicated automation user with execute permissions on the job templates the connector should use.
2. Create a personal access token for that user (User → Tokens), or an OAuth2 application token.
3. If the server uses a private CA, retrieve the CA certificate as PEM.
4. Enter the API server URL, API base path, token, and optional CA when configuring the connector in {{kib}}.
