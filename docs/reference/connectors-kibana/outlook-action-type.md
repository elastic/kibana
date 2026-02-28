---
navigation_title: "Outlook"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/outlook-action-type.html
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Outlook connector [outlook-action-type]

The Outlook connector enables federated search and retrieval of email messages from Microsoft Outlook mailboxes using the Microsoft Graph API.

## Create connectors in {{kib}} [define-outlook-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [outlook-connector-configuration]

Outlook connectors have the following configuration properties:

Token URL
:   The OAuth 2.0 token endpoint URL. Use the format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`

Client ID
:   The application (client) ID from your Microsoft Entra app registration.

Client Secret
:   The client secret generated for your Microsoft Entra application.


## Test connectors [outlook-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by accessing the Microsoft Graph API root endpoint.

The Outlook connector has the following actions:

Search messages
:   Search for messages across all mailboxes using the Microsoft Graph Search API.
    - **query** (required): The search query string (KQL syntax supported).
    - **from** (optional): Offset for pagination.
    - **size** (optional): Number of results to return (max 25).

List mail folders
:   List mail folders for a user.
    - **userId** (required): User ID or user principal name (for example, `user@contoso.com`).

List messages
:   List messages in a mail folder. Defaults to the Inbox if no folder ID is provided.
    - **userId** (required): User ID or user principal name (for example, `user@contoso.com`).
    - **folderId** (optional): Mail folder ID. Defaults to Inbox if omitted.
    - **top** (optional): Number of messages to return (max 50).
    - **skip** (optional): Number of messages to skip for pagination.
    - **filter** (optional): OData `$filter` expression (for example, `isRead eq false`).

Get message
:   Retrieve a specific message by ID, including full body content.
    - **userId** (required): User ID or user principal name (for example, `user@contoso.com`).
    - **messageId** (required): The message ID.

Search user messages
:   Search messages within a specific user mailbox using the OData `$search` query parameter.
    - **userId** (required): User ID or user principal name (for example, `user@contoso.com`).
    - **query** (required): Search query string. Supports KQL-like syntax for subject, body, and from fields.
    - **top** (optional): Number of results to return (max 25).


## Get API credentials [outlook-api-credentials]

To use the Outlook connector, you need to:

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
     - `Mail.Read` - Read mail in all mailboxes
     - `Mail.ReadBasic.All` - Read basic mail properties in all mailboxes
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
