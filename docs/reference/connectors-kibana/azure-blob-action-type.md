---
navigation_title: "Azure Blob Storage"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/azure-blob-action-type.html
applies_to:
  stack: preview
  serverless: preview
---

# Azure Blob Storage connector [azure-blob-action-type]

The Azure Blob Storage connector integrates with Azure Blob Storage via the [Blob Service REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api). It supports listing containers, listing blobs, retrieving blob content, and getting blob properties. Use it as a data source for federated search in Workplace AI.

## Create connectors in {{kib}} [define-azure-blob-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [azure-blob-connector-configuration]

Azure Blob Storage connectors have the following configuration properties:

Storage account URL
:   The blob service endpoint for your storage account (e.g. `https://myaccount.blob.core.windows.net`). Find this in the Azure Portal under your storage account **Endpoints**.

Bearer Token (Azure AD / Entra ID)
:   An OAuth 2.0 access token from Microsoft Entra ID (formerly Azure AD) with permission to access the storage account. The connector sends this in the `Authorization: Bearer` header. See [Get API credentials](#azure-blob-api-credentials) for how to obtain a token.

## Test connectors [azure-blob-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by calling the List Containers API with `maxresults=1`.

The Azure Blob Storage connector has the following actions:

List containers
:   List containers in the storage account.
    - **prefix** (optional): Filter containers by name prefix.
    - **maxresults** (optional): Maximum number of containers to return.
    - **marker** (optional): Continuation token for pagination.

List blobs
:   List blobs in a container.
    - **container** (required): Container name.
    - **prefix** (optional): Filter blobs by name prefix.
    - **maxresults** (optional): Maximum number of blobs to return.
    - **marker** (optional): Continuation token for pagination.

Get blob
:   Download blob content and metadata. Returns base64-encoded content plus content-type and content-length.
    - **container** (required): Container name.
    - **blobName** (required): Blob name (path).

Get blob properties
:   Return blob system properties (content-type, content-length, last-modified, etag) without downloading the blob body.
    - **container** (required): Container name.
    - **blobName** (required): Blob name (path).

## Get API credentials [azure-blob-api-credentials]

To use the Azure Blob Storage connector, you need a **Microsoft Entra ID (Azure AD) access token** with the appropriate role on your storage account (e.g. **Storage Blob Data Reader** or **Storage Blob Data Contributor**).

1. In the [Azure Portal](https://portal.azure.com), open your storage account.
2. Assign the desired role to your user or app (e.g. **Access control (IAM)** > **Add role assignment** > **Storage Blob Data Reader**).
3. Obtain an OAuth 2.0 access token:
   - **For user auth**: Use [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/) (`az account get-access-token --resource https://storage.azure.com/`) or an interactive OAuth flow.
   - **For app auth**: Use the [OAuth 2.0 client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow) with scope `https://storage.azure.com/.default`. Register an app in Entra ID, create a client secret, and request a token from `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`.

For details, see [Authorize with Microsoft Entra ID](https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-azure-active-directory).
