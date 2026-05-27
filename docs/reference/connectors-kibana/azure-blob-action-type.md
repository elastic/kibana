---
navigation_title: "Azure Blob Storage"
type: reference
description: "Use the Azure Blob Storage connector to list containers and blobs, retrieve blob content, and get blob properties using the Azure Blob Service REST API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Azure Blob Storage connector [azure-blob-action-type]

The Azure Blob Storage connector integrates with Azure Blob Storage using the [Blob Service REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api). It supports listing containers, listing blobs, retrieving blob content, and getting blob properties. Use it as a data source for federated search.

## Create connectors in {{kib}} [define-azure-blob-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [azure-blob-connector-configuration]

Azure Blob Storage connectors have the following configuration properties:

Storage account URL
:   The blob service endpoint for your storage account (for example, `https://myaccount.blob.core.windows.net`). Find this in the Azure Portal under your storage account **Endpoints**.

Storage account name and key (Shared Key)
:   The connector uses **Shared Key** authentication. Provide your storage account name and one of its account keys (from Azure Portal → Storage account → **Access keys**). The connector signs each request with HMAC-SHA256 per the [Azure REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key). When creating a connector via the data source API, credentials must be in the form `accountName:accountKey` (one line, first colon separates name from key; the key is base64 and must not contain colons). See [Get API credentials](#azure-blob-api-credentials).

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

The connector uses **Shared Key** (storage account key) authentication.

1. In the [Azure Portal](https://portal.azure.com), open your storage account.
2. Go to **Security + networking** → **Access keys** (or **Storage account** → **Access keys**).
3. Copy the **Storage account name** (for example, `myaccount`) and one of the **Key** values (key1 or key2). The key is a base64-encoded string.
4. When creating the connector from the UI, enter the account name and key in the configured fields. When using the data source creation API, pass credentials as a single string in the form `accountName:accountKey` (for example, `myaccount:base64key...`); the first colon separates the name from the key, so the key itself must not contain colons.

For details, see [Authorize with Shared Key](https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key).
