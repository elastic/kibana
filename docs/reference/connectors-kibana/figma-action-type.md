---
navigation_title: "Figma"
type: reference
description: "Use the Figma connector to browse design files, inspect structure, render nodes, and explore team projects in Figma."
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/figma-action-type.html
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Figma connector [figma-action-type]

The Figma connector communicates with the [Figma REST API](https://developers.figma.com/docs/rest-api/) to browse design files, inspect document structure, render nodes as images, and explore team projects. It can be used with Agent Builder and Workflows.

## Create connectors in {{kib}} [define-figma-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [figma-connector-configuration]

Figma connectors support **API key (header)** authentication (a Figma personal access token sent in the `X-Figma-Token` header) or **OAuth 2.0 authorization code** (Figma signs the user in through {{kib}} and {{kib}} stores refreshable tokens). Select the authentication type when you create or edit the connector.

API key (header)
:   A Figma personal access token sent in the `X-Figma-Token` header. See [Get API credentials](#figma-api-credentials).

OAuth 2.0 authorization code
:   Uses an **OAuth app** registered in Figma. In {{kib}} you provide:

    - **Client ID** and **Client Secret**: from your Figma OAuth app
    - **Redirect URI**: register {{kib}}'s OAuth callback in your Figma OAuth app (see [Get API credentials](#figma-api-credentials))

    The connector automatically uses the correct Figma OAuth endpoints and scopes (`current_user:read`, `file_content:read`, and `projects:read`).

## Test connectors [figma-action-configuration]

You can test connectors when creating or editing the connector in {{kib}}. The test verifies connectivity by calling the Figma API to fetch the current user (for example handle or email).

The Figma connector has the following actions:

Who am I
:   Get the currently authenticated Figma user. Returns the user's **id**, **handle**, **email**, and **img_url** for the API credentials in use. No parameters.

List team projects
:   List all projects in a Figma team. Returns **teamId** (for use in later steps) and project list. Use the returned project IDs with **List project files** to browse files. Provide either **teamId** or **url**; if you do not have the team ID, ask the user to paste the team page URL.
    - **teamId** (optional): The Figma team ID from the team page URL. If not available, use **url** instead or ask the user to paste the team page URL.
    - **url** (optional): Figma team page URL (for example `figma.com/team/123/Team-Name`). The team ID will be extracted. If neither teamId nor url is provided, ask the user to paste the team page URL.

List project files
:   List all files in a Figma project. Returns file names, keys, thumbnail URLs, and last modified dates. Use the returned file keys with **Get file** or **Render nodes**.
    - **projectId** (required): The Figma project ID (from **List team projects** or the project URL).

Get file
:   Get a Figma file's structure, metadata, components, and styles. The file key can be taken from any Figma file URL of the form `https://www.figma.com/:file_type/:file_key/:file_name`, where `file_type` is one of `design`, `file`, `board`, `proto`, or `slides`.
    - **fileKey** (required): The file key from the Figma file URL.
    - **nodeIds** (optional): Comma-separated node IDs to retrieve specific nodes (for example `1:2,1:3`).
    - **depth** (optional): How deep into the document tree to traverse. `1` = pages only; `2` = pages and top-level objects. Omit for the full tree.

Render nodes
:   Render Figma nodes as images. Returns temporary image URLs (valid for 30 days). Supports PNG, JPG, SVG, and PDF.
    - **fileKey** (required): The file key from the Figma file URL.
    - **nodeIds** (required): Comma-separated node IDs to render (for example `1:2,1:3`). Find node IDs in Figma URLs (`?node-id=1:2`) or from **Get file** output.
    - **format** (optional): Image format: `png`, `jpg`, `svg`, or `pdf`. Defaults to `png`.
    - **scale** (optional): Scale factor between 0.01 and 4. Defaults to `1`.

## Discovery model: Hierarchy only [figma-discovery-model]

Figma does not provide a full-text search over files. Discovery is **hierarchical**: use **List team projects** (with a team ID or team page URL), then **List project files** (with a project ID), then **Get file** (and optionally **Render nodes**). When using this connector as a data source in chat or Agent Builder, users navigate by team and project; there is no single "search my Figma files for X" action. The Figma REST API does not offer a global search endpoint.

## Connector networking configuration [figma-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

<a id="figma-api-credentials"></a>
## Get API credentials [figma-api-credentials]

The Figma connector supports two authentication methods: **OAuth 2.0 authorization code** (recommended) and **API key (header)** using a personal access token.

### OAuth 2.0 authorization code (recommended)

This matches the **OAuth 2.0 authorization code** authentication type in {{kib}}. You register a Figma OAuth app, then let users authorize the connector with their own Figma account; {{kib}} handles the token exchange and refresh automatically.

1. Log in to [Figma](https://www.figma.com/) and go to [figma.com/developers/apps](https://www.figma.com/developers/apps).
2. Select **Create new app** and enter a name (for example "Kibana").
3. Open your draft app and start the configuration flow.
4. On the **OAuth credentials** page, copy the **Client ID** and **Client Secret**. The Client Secret is only shown once, so store it securely.
5. On the same page, select **Add a redirect URL** and enter {{kib}}'s OAuth callback URL. Copy the pattern below and substitute your public {{kib}} hostname:

    ```text
    https://<your-kibana-host>/api/actions/connector/_oauth_callback
    ```

6. On the **OAuth scopes** page, select the following scopes:

    - `current_user:read` — read your name, email, and profile image
    - `file_content:read` — read the contents of files, such as nodes and the editor type
    - `projects:read` — list projects and files in projects

7. Complete the configuration flow and publish the app. Private apps are available immediately; public apps require Figma review.
8. In {{kib}}, create a Figma connector and select **OAuth 2.0 authorization code** as the authentication method. Enter the **Client ID** and **Client Secret**, then authorize with your Figma account. The connector automatically configures the correct Figma OAuth endpoints and scopes.

::::{note}
Figma access tokens expire after 90 days. The connector automatically refreshes them using the stored refresh token, so no manual rotation is required as long as the refresh token remains valid.
::::

### Personal access token (API key header)

Use this method if you prefer a static token tied to your own Figma account. Tokens grant access to your Figma account and files shared with you.

1. Log in to [Figma](https://www.figma.com/).
2. Open your [account settings](https://www.figma.com/settings) and select the **Security** tab.
3. Scroll to **Personal access tokens** and select **Generate new token**.
4. Name the token (for example "Kibana Figma connector"), set an expiration, and select the following scopes:

    - `current_user:read`
    - `file_content:read`
    - `projects:read`

5. Select **Generate token** and copy the token value. This is your only chance to copy it, so store it securely.
6. In {{kib}}, create a Figma connector, select **API key (header)** as the authentication method, and paste the token as the value for `X-Figma-Token`.

Keep the token secret because it grants access to your Figma account and files shared with you.
