---
navigation_title: "Figma"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/figma-action-type.html
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Figma connector [figma-action-type]

The Figma connector communicates with the Figma REST API to browse design files, inspect document structure, render nodes as images, and explore team projects. It is used as a data source for Workplace AI (e.g. Agent Builder).

## Create connectors in {{kib}} [define-figma-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [figma-connector-configuration]

Figma connectors use API key (header) authentication:

X-Figma-Token
:   A Figma personal access token. See [Get API credentials](#figma-api-credentials) for how to obtain it.

## Test connectors [figma-action-configuration]

You can test connectors when creating or editing the connector in {{kib}}. The test verifies connectivity by calling the Figma API to fetch the current user (e.g. handle or email).

The Figma connector has the following actions:

Who am I
:   Get the currently authenticated Figma user. Returns the user's **id**, **handle**, **email**, and **img_url** for the API credentials in use. No parameters.

Parse Figma URL
:   Parse a Figma URL (file or team page) and return extracted **file_key**, **team_id**, and **node_id** when present. No API call—useful when the user pastes a link so you can then call **Get file**, **List team projects** or **List project files**, or **Render nodes** with the returned IDs. Supported URLs: file links (`figma.com/design/...`, `figma.com/file/...`, `figma.com/board/...`, `figma.com/proto/...`, `figma.com/slides/...`) and team page links (`figma.com/team/TEAM_ID/...`). Node IDs from `?node-id=1-2` are normalized to colon form (`1:2`) for the API. **project_id** is not extracted; use **List team projects** with the returned team_id to get project IDs.
    - **url** (required): A Figma URL pasted from the browser (file or team page).

List team projects
:   List all projects in a Figma team. Use the returned project IDs with **List project files** to browse files.
    - **teamId** (required): The Figma team ID. Find it in the URL when viewing a team page in Figma.

List project files
:   List all files in a Figma project. Returns file names, keys, thumbnail URLs, and last modified dates. Use the returned file keys with **Get file** or **Render nodes**.
    - **projectId** (required): The Figma project ID (from **List team projects** or the project URL).

Get file
:   Get a Figma file's structure, metadata, components, and styles. The file key can be taken from any Figma file URL: `https://www.figma.com/file/FILE_KEY/...`.
    - **fileKey** (required): The file key from the Figma file URL.
    - **node_ids** (optional): Comma-separated node IDs to retrieve specific nodes (e.g. `1:2,1:3`).
    - **depth** (optional): How deep into the document tree to traverse. `1` = pages only; `2` = pages and top-level objects. Omit or increase for the full tree. Defaults to `2`.

Render nodes
:   Render Figma nodes as images. Returns temporary image URLs (valid for 30 days). Supports PNG, JPG, SVG, and PDF.
    - **fileKey** (required): The file key from the Figma file URL.
    - **node_ids** (required): Comma-separated node IDs to render (e.g. `1:2,1:3`). Find node IDs in Figma URLs (`?node-id=1:2`) or from **Get file** output.
    - **format** (optional): Image format: `png`, `jpg`, `svg`, or `pdf`. Defaults to `png`.
    - **scale** (optional): Scale factor between 0.01 and 4. Defaults to `1`.

## Discovery model: hierarchy only [figma-discovery-model]

Figma does not provide a full-text search over files. Discovery is **hierarchical**: use **List team projects** (with a team ID), then **List project files** (with a project ID), then **Get file** (and optionally **Render nodes**). When using this connector as a data source in chat or Agent Builder, users navigate by team and project; there is no single "search my Figma files for X" action. The Figma REST API does not offer a global search endpoint.

## Connector networking configuration [figma-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

<a id="figma-api-credentials"></a>
## Get API credentials [figma-api-credentials]

To use the Figma connector, you need a Figma personal access token:

1. Log in to [Figma](https://www.figma.com/).
2. Open your **Account settings** (profile menu → Settings, or [Figma account settings](https://www.figma.com/settings)).
3. Scroll to **Personal access tokens** and click **Generate new token**.
4. Name the token (e.g. "Kibana Figma connector") and copy the token value.
5. Use this value as **X-Figma-Token** in the connector configuration. The connector sends it in the `X-Figma-Token` header per the [Figma REST API](https://developers.figma.com/docs/rest-api/).

Keep the token secret; it grants access to your Figma account and files shared with you.
