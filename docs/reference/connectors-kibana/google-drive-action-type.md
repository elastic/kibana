---
navigation_title: "Google Drive"
type: reference
description: "Use the Google Drive connector to search, list, and download files and folders from Google Drive."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Google Drive connector [google-drive-action-type]

The Google Drive connector enables searching and accessing files and folders in Google Drive.

## Create connectors in {{kib}} [define-google-drive-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [google-drive-connector-configuration]

Google Drive connectors support **Bearer Token** (a static access token you supply) or **OAuth 2.0 authorization code**
(Google signs the user in through {{kib}} and {{kib}} stores refreshable tokens). Choose the authentication type when you
create or edit the connector.

Bearer Token
:   A Google OAuth 2.0 access token with Google Drive API scopes. See **Get API credentials**.

OAuth 2.0 authorization code
:   Uses a **Web application** OAuth client in Google Cloud. In {{kib}} you provide:

    - **Client ID** and **Client Secret**: from that OAuth client
    - **Redirect URI**: register {{kib}}’s OAuth callback in Google Cloud (see **Get API credentials**)

    The connector automatically uses the correct Google OAuth endpoints and scopes (`https://www.googleapis.com/auth/drive.readonly` and `https://www.googleapis.com/auth/drive.metadata.readonly`).

## Test connectors [google-drive-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by fetching the authenticated user's information from the Google Drive API.

The Google Drive connector has the following actions:

Search files
:   Search for files in Google Drive using Google's query syntax.
    - `query` (required): Google Drive query string. Use `fullText contains 'term'` for content search, `name contains 'term'` for filename search, `mimeType='application/pdf'` for type filtering, `modifiedTime > '2024-01-01'` for date filtering. Combine with `and` or `or`.
    - `pageSize` (optional): Maximum number of files to return (1 to 1000). Defaults to 250.
    - `pageToken` (optional): Token for pagination from a previous response.
    - `orderBy` (optional): Sort order. Valid values: `createdTime`, `createdTime desc`, `modifiedTime`, `modifiedTime desc`, `name`, `name desc`.

List files
:   List files and subfolders in a Google Drive folder.
    - `folderId` (optional): Parent folder ID. Use `root` for the root folder, or a folder ID from search or list results. Defaults to `root`.
    - `pageSize` (optional): Maximum number of files to return (1 to 1000). Defaults to 250.
    - `pageToken` (optional): Token for pagination from a previous response.
    - `orderBy` (optional): Sort order: `name`, `modifiedTime`, or `createdTime`.
    - `includeTrashed` (optional): Include trashed files in results. Defaults to `false`.

Download file
:   Download a file's content. For native files (PDF, DOCX, and others), this action downloads the file directly. For Google Workspace documents (Docs, Sheets, Slides), it exports to a standard format (PDF for documents, XLSX for spreadsheets).
    - `fileId` (required): The ID of the file to download.

Get file metadata
:   Get detailed metadata for specific files, including ownership, sharing status, permissions, and descriptions. Use after a search or list action to inspect specific files.
    - `fileIds` (required): Array of file IDs to retrieve metadata for.

## Connector networking configuration [google-drive-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [google-drive-api-credentials]

### OAuth 2.0 authorization code (recommended for ongoing use)

This matches the **OAuth 2.0 authorization code** authentication type in {{kib}}. Configure a **Web application** OAuth
client in Google Cloud (similar to common guides that use **Authorized JavaScript origins** and **Authorized redirect
URIs**).

Start in **[Google Cloud Console](https://console.cloud.google.com/)**. 

1. In Google Cloud Console, select or create a project. Enable the **Google Drive API** for that project (**APIs &
   Services** > **Library**).
2. Open **APIs & Services** > **OAuth consent screen**. 
   - Create OAuth Client 
   - Select Web Application,
   - The **Name** can be something like 'Elastic' or 'Kibana'   
   - Under **Authorized JavaScript origins**, add the base origin of your {{kib}} deployment (scheme, host, and port only—for
      example `https://my-kibana.example.com`). 
   - Under **Authorized redirect URIs**, add {{kib}}’s connector OAuth callback for your host. Copy the pattern below and
   substitute your public {{kib}} hostname:
    ```text
    https://<your-kibana-host>/api/actions/connector/_oauth_callback
    ```
3. Open **APIs & Services** > **Data Access** and choose scopes your integration needs (at minimum the readonly scopes
   the connector uses by default:
   `https://www.googleapis.com/auth/drive.readonly` and
   `https://www.googleapis.com/auth/drive.metadata.readonly`, or broader scopes if your policy allows).

4. Create the client, then copy **Client ID** and **Client secret** into the connector in {{kib}} when you select **OAuth
   2.0 authorization code**. The connector automatically configures the correct Google OAuth endpoints and scopes.

### Bearer token (manual, short-lived)

To use **Bearer Token** authentication, you need a Google OAuth 2.0 access token with Drive API scopes. One way to obtain
a token for testing is Google’s OAuth 2.0 Playground.

1. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. In the list of APIs, select **Drive API v3** and select the `https://www.googleapis.com/auth/drive.readonly` scope (or `https://www.googleapis.com/auth/drive` for full access).
3. Select **Authorize APIs** and sign in with your Google account.
4. Select **Exchange authorization code for tokens**.
5. Copy the **Access token** and enter it as the **Bearer Token** when configuring the connector in {{kib}}.
