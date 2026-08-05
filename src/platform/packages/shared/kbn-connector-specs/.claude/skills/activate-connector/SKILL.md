---
name: activate-connector
description: Creates a connector instance in a running Kibana. Use when asked to activate, connect, enable, or instantiate a connector in Kibana.
allowed-tools: Bash, Read, Glob, Grep
argument-hint: [connector-type]
---

# Activate a Connector in Kibana

This skill activates a **$ARGUMENTS** connector instance in a running Kibana. **Prefer having the user
create it themselves through the Kibana UI (Step 3)** rather than creating it yourself via the Actions API
(Step 4, fallback only). Two reasons:

1. **UI verification.** The connector's config `schema` drives a dynamically-generated form in the Kibana
   UI (field widgets, labels, validation). That generator has real gaps — e.g. no widget exists for
   `z.number()` fields — that only show up when a human actually opens the "Create connector" form. An
   API-created connector never exercises that form at all, so a broken form for a brand-new connector type
   can go unnoticed until a real user hits it later.
2. **Credentials never touch the agent.** Even with Step 4's script-mediated flow, the credential still has
   to exist somewhere the agent's tool calls can reference (a file path, a command argument). Creating the
   connector directly in the browser means the live credential value never needs to flow through the agent
   or any script at all — the strongest guarantee, not just a mitigated one.

When `agentBuilder:experimentalFeatures` is enabled, creating a connector automatically indexes it into the Semantic Metadata Layer (SML), making its sub-actions discoverable by AI agents. This happens the same way regardless of whether the connector was created via the UI or the API.

**CRITICAL: Never read, log, or display the contents of any credentials file. Credentials must only flow through the bundled scripts.** This applies to Step 4 (fallback) only — Step 3 (preferred) never puts a credential in a file or script argument in the first place.

## Step 1: List Available Connector Types

Run the helper script to see what connector types are registered. This script auto-detects whether Kibana is running on http/https and with standard/serverless auth — no manual configuration needed.

```bash
src/platform/packages/shared/kbn-connector-specs/.claude/skills/activate-connector/scripts/list_connector_types.sh
```

If the script reports that it cannot detect a running Kibana instance, stop and tell the user:
> Kibana does not appear to be running. Please start Elasticsearch and Kibana first:
> ```
> yarn es snapshot   # in one terminal
> yarn start         # in another terminal
> ```
> Then re-run this skill.

Match the user's argument (`$ARGUMENTS`) to one of the listed type IDs. If no exact match, show the user the available types and ask them to pick one.

## Step 2: Check for Existing Connectors

Run the helper script to see what's already created:

```bash
src/platform/packages/shared/kbn-connector-specs/.claude/skills/activate-connector/scripts/list_connectors.sh
```

If a connector of the same type already exists, inform the user and ask if they want to create another one or stop.

## Credential Reference

Use this table to tell the user what credential to provide. Look up the connector spec's auth type in `src/platform/packages/shared/kbn-connector-specs/src/specs/` to confirm.

### Common auth types

| Auth Type | Credential Format | Example |
|-----------|-------------------|---------|
| `bearer` | A bearer/access token string | `ghp_abc123...` |
| `api_key_header` | An API key string | `sk-abc123...` |
| `basic` | `username:password` | `admin:secretpass` |

### Known connectors

| Connector | Type ID | Auth Type | Credential to Provide |
|-----------|---------|-----------|----------------------|
| **GitHub** | `.github` | Bearer | GitHub personal access token (`ghp_...` or `github_pat_...`) |
| **Notion** | `.notion` | Bearer | Notion API integration token (starts with `secret_` or `ntn_`) |
| **Google Drive** | `.google_drive` | Bearer | Google OAuth 2.0 access token (`ya29....`) |
| **Slack** | `.slack2` | Bearer | Slack Bot User OAuth Token (`xoxb-...`) |
| **Jira Cloud** | `.jira-cloud` | Basic | `your_email@example.com:your_api_token` |
| **Zendesk** | `.zendesk` | Basic | `your_email@example.com/token:your_api_token` |
| **SharePoint Online** | `.sharepoint-online` | OAuth | Requires OAuth client credentials (clientId, clientSecret, tenantId). May need UI-based setup. |

### For unknown / newly added connectors

If the connector type isn't listed above:
1. Check the connector spec: `grep -r "auth:" src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/`
2. Look for `types: ['bearer']`, `types: ['api_key_header']`, or `types: ['oauth_client_credentials']`
3. If bearer: the credential is a token string
4. If api_key_header: the credential is an API key string
5. If oauth_client_credentials: warn the user this may need UI-based setup

## Step 3: Ask the User to Create the Connector via the Kibana UI (preferred)

First, determine what credential the connector needs. Use the **Credential Reference** section above and
the connector spec's auth type to identify the correct format, so you can tell the user what to have ready.

Then ask the user to create the connector themselves, using the AskUserQuestion tool. Reference the type's
`name` from Step 1 (what to search for in the UI) and the credential format from the Credential Reference,
for example, for GitHub:

> Please create the connector yourself in Kibana so you can confirm the form renders correctly, and so the
> credential never has to pass through me:
>
> 1. Go to **Stack Management → Connectors → Create connector**
> 2. Search for **"GitHub"** and select it
> 3. Enter a name, and paste in your **GitHub personal access token** (starts with `ghp_` or `github_pat_`)
> 4. Click **Save & test**
>
> Let me know once it's saved, and mention if anything about the form looked off (missing/mislabeled
> fields, a field that wouldn't accept your input, etc.) — that's exactly the kind of thing this step is
> meant to catch.

Wait for the user's confirmation before moving on to Step 5 (Verify Activation). If the user reports the
form looked broken or refused to save, treat that as a connector bug to fix (e.g. a `z.number()` config
field with no widget — see `create-connector/reference/connector-patterns.md`), not something to route
around via Step 4.

## Step 4: Fallback — Agent-Driven Creation via Script

Only use this path if the user explicitly asks you to create the connector for them instead of doing it
via the UI (e.g. they're not available to click through the form themselves), or there is no human present
to drive Step 3 (a fully automated/batch run). Default to Step 3.

This path does lose both of Step 3's guarantees: the connector creation form never gets exercised by a
human, and the credential does have to flow through a file and a script argument, even though the agent
itself still never reads its contents.

### Step 4a: Collect Credentials Securely

Ask the user to write their credentials to a temporary file. Use the AskUserQuestion tool to present this request clearly, **including the specific credential type and format they need**.

For example, if activating a GitHub connector (bearer token):

> To activate the GitHub connector, I need a **GitHub personal access token** (starts with `ghp_` or `github_pat_`).
>
> For security, please write it to a temporary file — I will **not** read this file. The creation script will read it and immediately delete it.
>
> Please run this in your terminal:
> ```
> echo -n 'ghp_your_token_here' > /tmp/connector_credentials
> ```
>
> Then let me know when the file is ready.

**Important:**
- NEVER read `/tmp/connector_credentials` or any credentials file the user creates
- NEVER use the Read tool on the credentials file
- NEVER `cat` or otherwise inspect the credentials file
- The `create_connector.sh` script handles reading and deleting it

### Step 4b: Run the Creation Script

Once the user confirms the credentials file is ready, run:

```bash
src/platform/packages/shared/kbn-connector-specs/.claude/skills/activate-connector/scripts/create_connector.sh \
  --type "<connector_type_id>" \
  --name "<display_name>" \
  --auth-type "<auth_type>" \
  --credentials-file /tmp/connector_credentials
```

Where:
- `<connector_type_id>` is the type ID from Step 1 (e.g., `.github`, `.notion`)
- `<display_name>` is a human-readable name for the connector instance
- `<auth_type>` is `bearer`, `api_key_header`, or `basic` — look up the connector spec's auth type from the Credential Reference above. If omitted, the script auto-detects (colon in credential → basic, else bearer), but **always pass it explicitly for `api_key_header` connectors** since auto-detection can't distinguish them from bearer tokens.

For `api_key_header` connectors, you **must also pass `--header-field`** with the header field name from the connector spec's `auth.types[].defaults.headerField`:
```bash
  --auth-type api_key_header --header-field "X-Api-Key"
```

If the connector requires additional config (e.g., `serverUrl` for MCP-native connectors), add:
```bash
  --config '{"serverUrl":"https://mcp.example.com/mcp/"}'
```

The script will auto-detect the Kibana URL and auth, read the credentials, delete the file, and make the API call.

## Step 5: Verify Activation

Run the list script to confirm the connector exists, regardless of which path (Step 3 or Step 4) created it:

```bash
src/platform/packages/shared/kbn-connector-specs/.claude/skills/activate-connector/scripts/list_connectors.sh
```

Show the user the newly created connector entry and capture its ID — later steps (e.g. `build-connector`'s
Task 6, creating a test agent) need it. If it appears, report success. If not, show any error output from
whichever step created it.

If Step 3 was used, this script confirms the connector *exists*, but not that the form experience was
clean — rely on the user's own confirmation from Step 3 for that (did it save without errors, did every
field render as expected). Don't skip asking for that feedback just because the list script came back clean.

## Important Notes

- **This skill requires Kibana to be running** — Step 1/2/5's list scripts and Step 4's creation script all make live API calls
- **Prefer Step 3 (UI) over Step 4 (script)** — see the reasons at the top of this document; only fall back to Step 4 if the user explicitly asks for it or no human is available
- **Auto-detection** (Steps 1, 2, 4, 5) tries http/https on localhost:5601 with both `elastic:changeme` (standard) and `elastic_serverless:changeme` (serverless) credentials
- **In Step 4, credentials are never seen by Claude** — they flow through the file -> script -> API pipeline only; the credentials file is deleted immediately after the script reads it. **In Step 3, credentials never exist as a file or script argument at all** — they go straight from the user into their browser
- **Connector sub-actions become available to agents** when `agentBuilder:experimentalFeatures` is true in Kibana settings, regardless of which step created the connector
- To override auto-detection, set `KIBANA_URL` and/or `KIBANA_AUTH` environment variables, or pass `--kibana-url` to the scripts
