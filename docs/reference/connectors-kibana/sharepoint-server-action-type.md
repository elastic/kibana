---
navigation_title: "SharePoint Server"
type: reference
description: "Use the SharePoint Server connector to search and retrieve documents, list items, folders, and site pages from an on-premises SharePoint Server instance."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# SharePoint Server connector [sharepoint-server-action-type]

Use the SharePoint Server connector to search and retrieve documents, list items, folders, and site pages from an on-premises SharePoint Server instance. It communicates with SharePoint Server through its native REST API (`/_api/`).

## Create connectors in {{kib}} [define-sharepoint-server-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [sharepoint-server-connector-configuration]

SharePoint Server connectors have the following configuration properties:

Site URL
:   The base URL of your SharePoint Server site or subsite (for example, `https://sharepoint.company.com/sites/mysite`). All API calls use this as the base.

Username
:   The username for HTTP Basic authentication. Use a dedicated service account with read access to the site.

Password
:   The password for HTTP Basic authentication.


## Test connectors [sharepoint-server-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The SharePoint Server connector has the following actions:

Get Web
:   Returns information about the current SharePoint site (web object), including its title, URL, and configuration.
    - No inputs required.

Get Lists
:   Returns all lists in the site, including document libraries and custom lists.
    - No inputs required.

Get List Items
:   Returns items from a named list.
    - **List Title** (required): The display title of the list (for example, `Documents` or `Tasks`).

Get Folder Contents
:   Returns the files and subfolders inside a folder specified by its server-relative URL.
    - **Path** (required): Server-relative URL of the folder (for example, `/sites/mysite/Shared Documents`).

Download File
:   Downloads the raw content of a file as UTF-8 text. For binary files (PDF, .docx), use the download workflow, which runs files through the Elasticsearch attachment ingest pipeline.
    - **Path** (required): Server-relative URL of the file (for example, `/sites/mysite/Shared Documents/report.txt`).

Get Site Page Contents
:   Returns the content of a SharePoint site page (from the Site Pages library), including its canvas content and wiki field.
    - **Page ID** (required): The integer item ID of the page in the Site Pages list.

Search
:   Runs a Keyword Query Language (KQL) search against the SharePoint Server search index.
    - **Query** (required): The KQL search string.
    - **From** (optional): Start row offset for pagination (default: 0).
    - **Size** (optional): Number of results to return.

Call REST API
:   Calls any SharePoint Server REST API endpoint directly. The path must start with `_api/`.
    - **Method** (required): `GET` or `POST`.
    - **Path** (required): API path starting with `_api/` (for example, `_api/web/title`).
    - **Body** (optional): Request body for POST requests.


## Get API credentials [sharepoint-server-api-credentials]

To use the SharePoint Server connector, you need:

1. **A service account**: Create or designate a dedicated Active Directory account for Kibana. Grant it read access to the SharePoint sites you want to index.

2. **HTTPS enabled**: Ensure the SharePoint web application is configured to use HTTPS. Basic authentication over plain HTTP is insecure and not recommended.

3. **Basic authentication enabled**: In SharePoint Central Administration, navigate to **Application Management > Manage web applications**, select your web application, select **Authentication Providers**, and verify that **Basic authentication** is enabled for the zone. If it is not enabled, contact your SharePoint administrator.

4. **Network access**: The Kibana server must be able to reach the SharePoint Server host on port 443 (HTTPS). Verify firewall rules allow this traffic.
