---
navigation_title: "Google Cloud Storage"
type: reference
description: "Use the Google Cloud Storage connector to list buckets and objects, retrieve metadata, and download files from GCS."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Google Cloud Storage connector [google-cloud-storage-action-type]

The Google Cloud Storage connector enables searching and accessing objects in Google Cloud Storage buckets.

## Create connectors in {{kib}} [define-google-cloud-storage-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [google-cloud-storage-connector-configuration]

Google Cloud Storage connectors support **Bearer Token** or **OAuth 2.0 authorization code** authentication.

Bearer Token
:   A Google OAuth 2.0 access token with Cloud Storage and Resource Manager API scopes. See **Get API credentials**.

OAuth 2.0 authorization code
:   Uses a **Web application** OAuth client in Google Cloud. In {{kib}} you typically provide:

    - **Authorization URL** (default): `https://accounts.google.com/o/oauth2/v2/auth`
    - **Token URL** (default): `https://oauth2.googleapis.com/token`
    - **Client ID** and **Client Secret**: from that OAuth client
    - **Scope** (defaults): `https://www.googleapis.com/auth/devstorage.read_only` and
      `https://www.googleapis.com/auth/cloudplatformprojects.readonly`
    - **Redirect URI**: register {{kib}}’s OAuth callback in Google Cloud (see **Get API credentials**)

## Test connectors [google-cloud-storage-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by calling the Google Cloud Storage API with the provided token.

The Google Cloud Storage connector has the following actions:

List projects
:   List Google Cloud projects accessible to the configured credentials. Use this to discover project IDs needed by the **List buckets** action.
    - `pageSize` (optional): Maximum number of projects to return (default: 100, max: 1000).
    - `pageToken` (optional): Token for pagination from a previous response.
    - `filter` (optional): Filter expression, for example `lifecycleState:ACTIVE`.

List buckets
:   List all Google Cloud Storage buckets in a project.
    - `project` (required): Google Cloud project ID. Use the **List projects** action to discover available project IDs.
    - `maxResults` (optional): Maximum number of buckets to return (default: 100, max: 1000).
    - `pageToken` (optional): Token for pagination from a previous response.
    - `prefix` (optional): Filter to only return buckets whose names begin with this prefix.

List objects
:   List objects in a GCS bucket. Supports prefix-based filtering to navigate folder-like hierarchies.
    - `bucket` (required): Name of the GCS bucket to list objects from.
    - `prefix` (optional): Filter objects whose names begin with this prefix. Use to navigate virtual folders, for example `reports/2024/`.
    - `delimiter` (optional): Character used to group object names. Use `/` to list only the current folder level.
    - `maxResults` (optional): Maximum number of objects to return (default: 100, max: 1000).
    - `pageToken` (optional): Token for pagination from a previous response.

Get object metadata
:   Retrieve detailed metadata for a specific GCS object, including content type, size, checksums, and timestamps.
    - `bucket` (required): Name of the bucket.
    - `object` (required): Full name or path of the object, for example `reports/2024/january.pdf`.

Download object
:   Download an object's content from GCS as base64-encoded data, suitable for text extraction and analysis.
    - `bucket` (required): Name of the bucket.
    - `object` (required): Full name or path of the object to download, for example `reports/2024/january.pdf`.

## Connector networking configuration [google-cloud-storage-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [google-cloud-storage-api-credentials]

### OAuth 2.0 authorization code (recommended for ongoing use)

Use when you select **OAuth 2.0 authorization code** in {{kib}}. Create a **Web application** OAuth client with
**Authorized JavaScript origins** ({{kib}} base URL) and **Authorized redirect URIs** ({{kib}} callback below).

Start in **[Google Cloud Console](https://console.cloud.google.com/)**. 

1. Select or create a project. Enable **Cloud Storage API** and **Cloud Resource Manager API** (**APIs & Services** >
   **Library**).
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
   `https://www.googleapis.com/auth/devstorage.read_only` and
   `https://www.googleapis.com/auth/cloudplatformprojects.readonly`, or broader scopes if your policy allows).

4. Copy **Client ID** and **Client secret** into the connector. Use default **Authorization URL** and **Token URL** unless
   your environment specifies otherwise.

### Bearer token (manual, short-lived)

Obtain a Google OAuth 2.0 access token with Cloud Storage and Resource Manager API scopes—for example using Google’s
OAuth 2.0 Playground.

1. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. In the list of APIs, select **Cloud Storage JSON API v1** and select the `https://www.googleapis.com/auth/devstorage.read_only` scope. Then also select **Cloud Resource Manager API v1** and select the `https://www.googleapis.com/auth/cloudplatformprojects.readonly` scope.
3. Select **Authorize APIs** and sign in with your Google account.
4. Select **Exchange authorization code for tokens**.
5. Copy the **Access token** and enter it as the **Bearer Token** when configuring the connector in {{kib}}.
