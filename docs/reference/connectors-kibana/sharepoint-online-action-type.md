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

Authorization URL
:   The OAuth 2.0 authorization endpoint URL. Use the format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize`
    Replace `{tenant-id}` with your actual Microsoft Entra tenant ID.

Token URL
:   The OAuth 2.0 token endpoint URL. Use the format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`
    Replace `{tenant-id}` with your actual Microsoft Entra tenant ID.

Client ID
:   The application (client) ID from your Microsoft Entra app registration.

Client Secret
:   The client secret generated for your Microsoft Entra application.

Scope
:   The OAuth scopes to request. Default: `https://graph.microsoft.com/.default offline_access`
    - `https://graph.microsoft.com/.default` - Requests all delegated permissions configured for your app
    - `offline_access` - Allows the connector to refresh access tokens automatically


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
:   Download item content from a pre-authenticated `downloadUrl`, returning text.
    - **downloadUrl** (required): A pre-authenticated download URL.

Call Graph API
:   Call a Microsoft Graph v1.0 endpoint by path only.
    - **method** (required): HTTP method, `GET` or `POST`.
    - **path** (required): Graph path starting with `/v1.0/` (for example, `/v1.0/me`).
    - **query** (optional): Query parameters (for example, `$top`, `$filter`).
    - **body** (optional): Request body (for `POST`).

Recommended flow
:   Use `getDriveItems` to fetch metadata and `downloadUrl`, decide which items are worth retrieving, then call `downloadItemFromURL` for the selected items. This avoids extra round trips just to fetch download metadata.


## Authorize the connector [sharepoint-online-authorization]

The SharePoint Online connector uses OAuth 2.0 Authorization Code Grant flow, which requires user authorization through Microsoft login.

After saving the connector configuration, click the **Authorize** button in the connector settings. This will:

1. Open a new browser window with Microsoft login
2. Prompt you to sign in with your Microsoft 365 account
3. Ask you to consent to the requested permissions
4. Redirect back to {{kib}} with an authorization code
5. Automatically exchange the code for access and refresh tokens

The connector will automatically refresh tokens when they expire. If you see authentication errors, click **Authorize** again to re-authenticate.

## Get API credentials [sharepoint-online-api-credentials]

To use the SharePoint Online connector, you need to create an app registration in Microsoft Entra (Azure AD) with OAuth 2.0 Authorization Code Grant flow:

### Step 1: Register an application

1. Go to the [Azure Portal](https://portal.azure.com/)
2. Navigate to **Microsoft Entra ID** > **App registrations**
3. Click **New registration**
4. Provide a name for your application (e.g., "Kibana SharePoint Connector")
5. Under **Supported account types**, select **Accounts in this organizational directory only**
6. Under **Redirect URI**:
   - Select **Web** as the platform
   - Enter your Kibana callback URL: `https://your-kibana-domain/internal/actions/connector/_oauth_callback`
     - Replace `your-kibana-domain` with your actual Kibana domain (e.g., `https://localhost:5601` for local development)
     - This must match the `server.publicBaseUrl` setting in your `kibana.yml`
7. Click **Register**

### Step 2: Configure API permissions (DELEGATED permissions)

**Important:** For OAuth Authorization Code flow, you must use **Delegated permissions**, not Application permissions.

1. In your app registration, go to **API permissions**
2. Click **Add a permission** > **Microsoft Graph** > **Delegated permissions**
3. Add the following permissions:
   - `Sites.Read.All` - Read items in all site collections
   - `User.Read` - Sign in and read user profile (added by default)
4. Click **Add permissions**
5. Click **Grant admin consent for [your organization]**
   - This step requires admin privileges
   - Without admin consent, each user will need to consent individually

**Why these permissions:**
- `Sites.Read.All` (delegated) - Required for the Microsoft Graph Search API to search SharePoint sites, lists, and documents on behalf of the signed-in user
- `User.Read` (delegated) - Required for basic user authentication

**Note:** The connector uses the scope `https://graph.microsoft.com/.default`, which automatically includes all delegated permissions you've granted to the app.

### Step 3: Create a client secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Provide a description (e.g., "Kibana SharePoint Connector Secret")
4. Select an expiration period (recommendation: 24 months)
5. Click **Add**
6. **Important:** Copy the secret **Value** immediately - it won't be shown again
   - The **Secret ID** is not the same as the secret value

### Step 4: Gather configuration information

Collect the following values to configure your connector:

**Tenant ID:**
- Found in **Microsoft Entra ID** > **Overview** > **Tenant ID**
- Or in your app registration **Overview** > **Directory (tenant) ID**

**Client ID:**
- Found in your app registration **Overview** > **Application (client) ID**

**Client Secret:**
- The value you copied in Step 3

**Authorization URL:**
- Format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize`
- Replace `{tenant-id}` with your actual Tenant ID
- Example: `https://login.microsoftonline.com/12345678-1234-1234-1234-123456789abc/oauth2/v2.0/authorize`

**Token URL:**
- Format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`
- Replace `{tenant-id}` with your actual Tenant ID
- Example: `https://login.microsoftonline.com/12345678-1234-1234-1234-123456789abc/oauth2/v2.0/token`

**Scope:**
- Default: `https://graph.microsoft.com/.default offline_access`
- Do not modify unless you have specific requirements

**Note:** The Region parameter is not supported when using OAuth Authorization Code flow with delegated permissions. If you need to use the Region parameter, you must use Application permissions (Client Credentials flow) instead.

## Common issues [sharepoint-online-troubleshooting]

**Authentication failed (HTTP 401)**

This error typically means:
- The access token has expired, been revoked, or doesn't have required scopes
- **Solution:** Click the **Authorize** button again to re-authenticate

**Invalid redirect URI**

If authorization fails with a redirect URI error:
- Ensure the redirect URI in your app registration matches `https://your-kibana-domain/internal/actions/connector/_oauth_callback`
- Verify `server.publicBaseUrl` is set correctly in `kibana.yml`
- The redirect URI must be registered as **Web** platform, not **Single-page application**

**Missing permissions**

If searches return no results or permission errors:
- Verify you added **Delegated permissions**, not Application permissions
- Ensure admin consent was granted
- Check that `Sites.Read.All` delegated permission is present in **API permissions**

**Token doesn't have required scopes**

If you see scope-related errors:
- Verify the Scope field includes `https://graph.microsoft.com/.default offline_access`
- Re-authorize the connector after adding missing permissions in Azure AD
- Ensure admin consent was granted for all delegated permissions
