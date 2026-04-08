---
navigation_title: "SharePoint Online"
type: reference
description: "Use the SharePoint Online connector to search across SharePoint sites, pages, drives, and lists using the Microsoft Graph API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# SharePoint Online connector [sharepoint-online-action-type]

The SharePoint Online connector enables federated search across SharePoint sites, pages, and content using the Microsoft Graph API.

## Create connectors in {{kib}} [define-sharepoint-online-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [sharepoint-online-connector-configuration]

SharePoint Online connectors have the following configuration properties:

Token URL
:   The OAuth 2.0 token endpoint URL. Use the format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`.

Client ID
:   The application (client) ID from your Microsoft Entra app registration.

Client Secret
:   The client secret generated for your Microsoft Entra application.

## Test connectors [sharepoint-online-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by accessing the root SharePoint site.

The SharePoint Online connector has the following actions:

Search
:   Search for content across SharePoint sites, lists, and drives using the Microsoft Graph Search API.
    - `query` (required): The search query string.
    - `entityTypes` (optional): Array of entity types to search. Valid values: `site`, `list`, `listItem`, `drive`, `driveItem`. Defaults to `site`.
    - `region` (optional): Search region (`NAM`, `EUR`, `APC`, `LAM`, `MEA`). Defaults to `NAM`.
    - `from` (optional): Offset for pagination.
    - `size` (optional): Number of results to return.

Get all sites
:   List all SharePoint sites.

Get site
:   Get a single site by ID or relative URL.
    - `siteId` (optional): Site ID.
    - `relativeUrl` (optional): Relative URL path (for example, `contoso.sharepoint.com:/sites/site-name`).

Get site pages
:   List pages for a site.
    - `siteId` (required): The site ID.

Get site page contents
:   Get page content (including `canvasLayout`) for a site page.
    - `siteId` (required): The site ID.
    - `pageId` (required): The page ID.

Get site drives
:   List drives for a site.
    - `siteId` (required): The site ID.

Get site lists
:   List lists for a site.
    - `siteId` (required): The site ID.

Get site list items
:   List items for a site list.
    - `siteId` (required): The site ID.
    - `listId` (required): The list ID.

Get drive items
:   List items in a drive by `driveId` (optionally by path). Returns metadata including `@microsoft.graph.downloadUrl`.
    - `driveId` (required): The drive ID.
    - `path` (optional): Path relative to drive root.

Download drive item (text)
:   Download a drive item by `driveId` and `itemId`, returning text content only.
    - `driveId` (required): The drive ID.
    - `itemId` (required): The drive item ID.

Download item from URL
:   Download item content from a pre-authenticated `downloadUrl`, returning base64.
    - `downloadUrl` (required): A pre-authenticated download URL.

Call Graph API
:   Call a Microsoft Graph v1.0 endpoint by path only.
    - `method` (required): HTTP method, `GET` or `POST`.
    - `path` (required): Graph path starting with `/v1.0/` (for example, `/v1.0/me`).
    - `query` (optional): Query parameters (for example, `$top`, `$filter`).
    - `body` (optional): Request body (for `POST`).

::::{tip}
Use `getDriveItems` to fetch metadata and `downloadUrl`, decide which items are worth retrieving, then call `downloadItemFromURL` for the selected items. This avoids extra round trips to fetch download metadata.
::::

## Connector networking configuration [sharepoint-online-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [sharepoint-online-api-credentials]

To use the SharePoint Online connector, register an application in Microsoft Entra (formerly Azure Active Directory):

1. Go to the [Azure Portal](https://portal.azure.com/).
2. Go to **Microsoft Entra ID** > **App registrations**.
3. Select **New registration**.
4. Enter a name for your application.
5. Select **Accounts in this organizational directory only**.
6. Select **Register**.
7. In your app registration, go to **API permissions**.
8. Select **Add a permission** > **Microsoft Graph** > **Application permissions**.
9. Add the following permissions:
   - `Sites.Read.All` — Read items in all site collections.
   - `Sites.ReadWrite.All` — Read and write items in all site collections (if write operations are needed).
10. Select **Grant admin consent** for your organization.
11. In your app registration, go to **Certificates & secrets**.
12. Select **New client secret**.
13. Enter a description and select an expiration period.
14. Select **Add**.
15. Copy the secret value immediately (you cannot view it again after you leave the page).
16. Enter the following values when configuring the connector in {{kib}}:
    - **Token URL**: `https://login.microsoftonline.com/{your-tenant-id}/oauth2/v2.0/token` (find your tenant ID in the **Overview** section of your app registration).
    - **Client ID**: Found in the **Overview** section (also called Application ID).
    - **Client Secret**: The value you copied in step 15.
