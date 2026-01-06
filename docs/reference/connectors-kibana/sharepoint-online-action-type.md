---
navigation_title: "SharePoint Online"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/sharepoint-online-action-type.html
applies_to:
  stack: preview
  serverless: preview
---

# SharePoint Online connector [sharepoint-online-action-type]

The SharePoint Online connector enables federated search capabilities across SharePoint sites, pages, and content using the Microsoft Graph API.

## Create connectors in {{kib}} [define-sharepoint-online-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [sharepoint-online-connector-configuration]

SharePoint Online connectors have the following configuration properties:

Region
:   The geographic region where your SharePoint tenant is hosted. Required for search operations. Valid values:
    - `NAM` - North America
    - `EUR` - Europe
    - `APC` - Asia Pacific
    - `LAM` - Latin America
    - `MEA` - Middle East and Africa

Token URL
:   The OAuth 2.0 token endpoint URL. Use the format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`

Client ID
:   The application (client) ID from your Microsoft Entra app registration.

Client Secret
:   The client secret generated for your Microsoft Entra application.


## Test connectors [sharepoint-online-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by accessing the root SharePoint site.

The SharePoint Online connector has the following action:

Search
:   Search for content across SharePoint sites, lists, and drives using Microsoft Graph Search API.
    - **query** (required): The search query string.
    - **entityTypes** (optional): Array of entity types to search. Valid values: `site`, `list`, `listItem`, `drive`, `driveItem`. Defaults to `driveItem`.
    - **from** (optional): Offset for pagination.
    - **size** (optional): Number of results to return.


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
   - **Region**: Select the geographic region where your Microsoft 365 tenant is hosted:
     - Check your SharePoint URL (e.g., `contoso.sharepoint.com` vs `contoso-my.sharepoint.eu`)
     - Common mappings: `.com` domains typically use `NAM`, `.eu` domains use `EUR`
     - If unsure, check your Microsoft 365 admin center under **Settings** > **Org settings** > **Organization profile**
   - **Tenant ID**: Found in **Overview** section of your app registration (needed for Token URL)
   - **Token URL**: Construct using the format `https://login.microsoftonline.com/{your-tenant-id}/oauth2/v2.0/token`
   - **Client ID**: Found in **Overview** section (also called Application ID)
   - **Client Secret**: The value you copied in step 3 (this is the only sensitive field)
