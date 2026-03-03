---
navigation_title: "SharePoint Online"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/sharepoint-online-action-type.html
applies_to:
  stack: preview 9.4
  serverless: preview
---

# SharePoint Online connector [sharepoint-online-action-type]

The SharePoint Online connector enables federated search capabilities across SharePoint sites, pages, and content using the Microsoft Graph API.

## Create connectors in {{kib}} [define-sharepoint-online-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [sharepoint-online-connector-configuration]

SharePoint Online connectors have the following configuration properties:

Token URL
:   The OAuth 2.0 token endpoint URL. Use the format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`

Client ID
:   The application (client) ID from your Microsoft Entra app registration.

Client Secret
:   The client secret generated for your Microsoft Entra application.


## Test connectors [sharepoint-online-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by accessing the root SharePoint site.

The SharePoint Online connector has the following actions:

Search
:   Search for content across SharePoint sites, lists, and drives using Microsoft Graph Search API.
    - **query** (required): The search query string.
    - **entityTypes** (optional): Array of entity types to search. Valid values: `site`, `list`, `listItem`, `drive`, `driveItem`. Defaults to `site`.
    - **region** (optional): Search region (`NAM`, `EUR`, `APC`, `LAM`, `MEA`). Defaults to `NAM`.
    - **from** (optional): Offset for pagination.
    - **size** (optional): Number of results to return.

Get all sites
:   List all SharePoint sites.

Get site
:   Get a single site by ID or relative URL.
    - **siteId** (optional): Site ID.
    - **relativeUrl** (optional): Relative URL path (for example, `contoso.sharepoint.com:/sites/site-name`).

Get site pages
:   List pages for a site.
    - **siteId** (required): The site ID.

Get site page contents
:   Get page content (including `canvasLayout`) for a site page.
    - **siteId** (required): The site ID.
    - **pageId** (required): The page ID.

Get site drives
:   List drives for a site.
    - **siteId** (required): The site ID.

Get site lists
:   List lists for a site.
    - **siteId** (required): The site ID.

Get site list items
:   List items for a site list.
    - **siteId** (required): The site ID.
    - **listId** (required): The list ID.

Get drive items
:   List items in a drive by `driveId` (optionally by path). Returns metadata including `@microsoft.graph.downloadUrl`.
    - **driveId** (required): The drive ID.
    - **path** (optional): Path relative to drive root.

Download drive item (text)
:   Download a drive item by `driveId` and `itemId`, returning text content only.
    - **driveId** (required): The drive ID.
    - **itemId** (required): The drive item ID.

Download item from URL
:   Download item content from a pre-authenticated `downloadUrl`, returning base64.
    - **downloadUrl** (required): A pre-authenticated download URL.

Call Graph API
:   Call a Microsoft Graph v1.0 endpoint by path only.
    - **method** (required): HTTP method, `GET` or `POST`.
    - **path** (required): Graph path starting with `/v1.0/` (for example, `/v1.0/me`).
    - **query** (optional): Query parameters (for example, `$top`, `$filter`).
    - **body** (optional): Request body (for `POST`).

Recommended flow
:   Use `getDriveItems` to fetch metadata and `downloadUrl`, decide which items are worth retrieving, then call `downloadItemFromURL` for the selected items. This avoids extra round trips just to fetch download metadata.


## Get API credentials [sharepoint-online-api-credentials]

To use the SharePoint Online connector, you need to:

1. Register an application in Microsoft Entra (Azure AD):
   - Go to the [Azure Portal](https://portal.azure.com/)
   - Navigate to **Microsoft Entra ID** > **App registrations**
   - Click **New registration**
   - Provide a name for your application
   - Select **Accounts in this organizational directory only**
   - Click **Register**

2. Configure API permissions:
   - In your app registration, go to **API permissions**
   - Click **Add a permission** > **Microsoft Graph** > **Application permissions**
   - Add the following permissions:
     - `Sites.Read.All` - Read items in all site collections
     - `Sites.ReadWrite.All` - Read and write items in all site collections (if write operations needed)
   - Click **Grant admin consent** for your organization

3. Create a client secret:
   - In your app registration, go to **Certificates & secrets**
   - Click **New client secret**
   - Provide a description and select an expiration period
   - Click **Add**
   - Copy the secret value immediately (it won't be shown again)

4. Gather the following information for the connector configuration:
   - **Tenant ID**: Found in **Overview** section of your app registration (needed for Token URL)
   - **Token URL**: Construct using the format `https://login.microsoftonline.com/{your-tenant-id}/oauth2/v2.0/token`
   - **Client ID**: Found in **Overview** section (also called Application ID)
   - **Client Secret**: The value you copied in step 3 (this is the only sensitive field)
