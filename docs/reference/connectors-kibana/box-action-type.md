---
navigation_title: "Box"
type: reference
description: "Box connector reference for searching files and folders, retrieving file content and metadata, and querying enterprise content with Box AI through the remote Box MCP server."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Box connector [box-action-type]

The Box connector integrates with Box through the official remote MCP server at `https://mcp.box.com`. It searches files and folders, retrieves file content and metadata, and answers questions about enterprise content using Box AI. Authentication options include Bearer token (developer token or OAuth access token) and OAuth Authorization Code.

## Create connectors in {{kib}} [define-box-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [box-connector-configuration]

Box connectors have the following configuration properties:

**MCP Server URL**
:   The URL of the remote Box MCP server. Defaults to `https://mcp.box.com`.

**Authentication**
:   Select one of the following authentication methods:
    - **Bearer Token**: A Box developer token or OAuth access token. Refer to [Get API credentials](#box-api-credentials) for instructions.
    - **OAuth Authorization Code**: Connects via Box's OAuth 2.0 flow. Requires a Box OAuth app with Client ID and Client Secret. Box pre-configures the authorization URL (`https://account.box.com/api/oauth2/authorize`) and token URL (`https://api.box.com/oauth2/token`). Refer to [OAuth credentials](#box-oauth-credentials) for setup instructions.

## Test connectors [box-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

The Box connector exposes the following actions:

`whoAmI`
:   Retrieve details about the currently authenticated Box user, including name, email, and account type.

`searchFilesKeyword`
:   Search for files in Box by keyword. Box searches across file names, content, descriptions, and metadata. Returns file IDs, names, and paths.

`searchFoldersByName`
:   Search for folders in Box by name. Returns folder IDs, names, and parent paths.

`listFolderContent`
:   List files and subfolders inside a specific Box folder. Use folder ID `0` for the root folder.

`getFileContent`
:   Retrieve the text content of a file stored in Box. Works with documents, spreadsheets, PDFs, and other text-extractable formats.

`getFileDetails`
:   Get detailed metadata for a specific Box file, including size, owner, modification date, permissions, and shared link status.

`getFolderDetails`
:   Get detailed metadata for a specific Box folder, including owner, permissions, and collaboration settings.

`listRecentItems`
:   List files and folders recently accessed or modified by the authenticated user. Useful for surfacing active content without a search query.

`getComments`
:   Retrieve all comments posted on a specific Box file, including comment text, author details, and timestamps.

`searchByMetadata`
:   Search for Box files and folders using metadata template fields and a structured query expression (for example, `amount >= 100 AND currency = "USD"`).

`aiQaSingleFile`
:   Ask Box AI a question about a single file. Returns an answer with citations. Files must be under 1 MB in extracted text.

`aiQaMultiFile`
:   Ask Box AI a question across multiple files simultaneously. Returns a unified answer with citations.

`aiQaHub`
:   Ask Box AI a question about the contents of a Box Hub. Returns an answer with citations from the hub's content.

`aiExtractFreeform`
:   Extract metadata from a Box file using a natural-language prompt. Returns structured key-value pairs for the described fields.

`aiExtractStructuredFromMetadataTemplate`
:   Extract structured metadata from a Box file using an existing enterprise metadata template. Box AI fills in the template fields automatically.

`listHubs`
:   List all Box Hubs accessible to the authenticated user.

`getHubDetails`
:   Get metadata and details for a specific Box Hub.

`getHubItems`
:   List files and folders associated with a specific Box Hub.

`listTools`
:   List all tools available on the Box MCP server. Use this to discover available capabilities, including write and admin tools not exposed as named actions.

`callTool`
:   Call any tool on the Box MCP server directly by name. Use this as a fallback option for tools not yet exposed as named actions (such as `upload_file`, `create_folder`, or `create_collaboration`).

## Connector networking configuration [box-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [box-api-credentials]

To use the Box connector with a developer token:

1. Log in to your [Box Developer Console](https://app.box.com/developers/console).
2. Select an existing application or create a new one (**Create New App** > **Custom App**).
3. Under **Configuration**, in the **Developer Token** section, select **Generate Developer Token**.
4. Copy the token and store it securely. Developer tokens expire after 60 minutes.
5. Use this value as the **Bearer Token** when configuring the Box connector in {{kib}}.

::::{note}
For production use, create a server-side application with OAuth 2.0 and use a long-lived access token instead of a developer token.
::::

## Get OAuth credentials [box-oauth-credentials]

To use the Box connector with OAuth Authorization Code:

1. Log in to your [Box Developer Console](https://app.box.com/developers/console).
2. Select an existing application or select **Create New App** > **Custom App** > **User Authentication (OAuth 2.0)**.
3. Under **Configuration**, set the **Redirect URI** to your Kibana OAuth redirect URI.
4. Copy the **Client ID** and **Client Secret** from the **OAuth 2.0 Credentials** section.
5. In {{kib}}, select **OAuth Authorization Code** as the authentication method and enter the Client ID and Client Secret. The authorization and token URLs are pre-configured.
6. Complete the authorization flow to connect your Box account.

::::{note}
The Box OAuth app must be authorized by a Box admin if it requires enterprise-level scopes such as `ai.readwrite`.
::::
