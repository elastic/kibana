---
navigation_title: "Google Drive"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/google-drive-action-type.html
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Google Drive connector [google-drive-action-type]

The Google Drive connector enables searching and accessing files and folders in Google Drive.

## Create connectors in {{kib}} [define-google-drive-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [google-drive-connector-configuration]

Google Drive connectors have the following configuration properties:

Bearer Token
:   A Google OAuth 2.0 access token with Google Drive API scopes. Check the [Get API credentials](#google-drive-api-credentials) for instructions.

## Test connectors [google-drive-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by fetching the authenticated user's information from the Google Drive API.

The Google Drive connector has the following actions:

Search files
:   Search for files in Google Drive using Google's query syntax.
    - **query** (required): Google Drive query string. Use `fullText contains 'term'` for content search, `name contains 'term'` for filename search, `mimeType='application/pdf'` for type filtering, `modifiedTime > '2024-01-01'` for date filtering. Combine with `and`/`or`.
    - **pageSize** (optional): Maximum number of files to return (1–1000). Defaults to 250.
    - **pageToken** (optional): Token for pagination from a previous response.
    - **orderBy** (optional): Sort order. Valid values: `createdTime`, `createdTime desc`, `modifiedTime`, `modifiedTime desc`, `name`, `name desc`.

List files
:   List files and subfolders in a Google Drive folder.
    - **folderId** (optional): Parent folder ID. Use `root` for the root folder, or a folder ID from search/list results. Defaults to `root`.
    - **pageSize** (optional): Maximum number of files to return (1–1000). Defaults to 250.
    - **pageToken** (optional): Token for pagination from a previous response.
    - **orderBy** (optional): Sort order: `name`, `modifiedTime`, or `createdTime`.
    - **includeTrashed** (optional): Include trashed files in results. Defaults to `false`.

Download file
:   Download a file's content. For native files (PDF, DOCX, etc.), downloads the file directly. For Google Workspace documents (Docs, Sheets, Slides), exports to a standard format (PDF for documents, XLSX for spreadsheets).
    - **fileId** (required): The ID of the file to download.

Get file metadata
:   Get detailed metadata for specific files, including ownership, sharing status, permissions, and descriptions. Use after search or list to inspect specific files.
    - **fileIds** (required): Array of file IDs to fetch metadata for. Returns: `id`, `name`, `mimeType`, `size`, `createdTime`, `modifiedTime`, `owners`, `lastModifyingUser`, `sharingUser`, `shared`, `starred`, `trashed`, `permissions`, `description`, `parents`, `labelInfo`, `webViewLink`.

## Connector networking configuration [google-drive-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [google-drive-api-credentials]

To use the Google Drive connector, you need a Google OAuth 2.0 access token with Drive API scopes. You can obtain one using the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/):

1. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. In the list of APIs, select **Drive API v3** and choose the `https://www.googleapis.com/auth/drive.readonly` scope (or `https://www.googleapis.com/auth/drive` for full access).
3. Click **Authorize APIs** and sign in with your Google account.
4. Click **Exchange authorization code for tokens**.
5. Copy the **Access token** and use it as the **Bearer Token** in the connector configuration.

