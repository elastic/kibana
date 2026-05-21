---
navigation_title: "Workday"
type: reference
description: "Search Workday workers, list organizations, and retrieve job postings with the Workday connector. Reference for OAuth 2.0 setup, connector configuration, and available actions."
applies_to:
  stack: preview
  serverless: preview
---

# Workday connector [workday-action-type]

The Workday connector connects directly to the Workday REST API (v1). It enables AI agents to search employees, browse organizational structure, and retrieve job postings from Workday HCM.

## Overview

The Workday connector uses Workday's REST API with OAuth 2.0 Client Credentials authentication. To configure the connector, you provide your Workday tenant URL, tenant name, and OAuth credentials.

## Create connectors in {{kib}} [define-workday-ui]

You can create a Workday connector in **{{stack-manage-app}} > {{connectors-ui}}** or when you add a Workday data source.

### Connector configuration [workday-connector-configuration]

**Tenant URL**
:   The base URL of your Workday tenant, for example `https://mycompany.workday.com`.

**Tenant Name**
:   The tenant identifier used in API paths, for example `mycompany`. Typically, this matches the subdomain in your Workday URL.

**Authentication**
:   OAuth 2.0 Client Credentials. You need a **Client ID**, **Client Secret**, and **Token URL** from a registered Workday API client scoped to an Integration System User (ISU).
    The token URL follows the pattern `https://wd2-impl-services1.workday.com/ccx/oauth2/<tenantName>/token`.

## Available actions [workday-available-actions]

| Action | Description |
|--------|-------------|
| `searchWorkers` | Search for workers (employees and contingent workers) by name. **Parameters:** `search` (optional), `limit`, `offset`. |
| `getWorker` | Retrieve the full profile of a single worker by WID. **Parameters:** `workerId` (required). |
| `listOrganizations` | List organizational units such as supervisory orgs, companies, and cost centers. **Parameters:** `type` (optional), `limit`, `offset`. |
| `getOrganization` | Retrieve full details of a single organization by WID. **Parameters:** `organizationId` (required). |
| `listJobPostings` | List active or closed job postings. **Parameters:** `status` (optional), `limit`, `offset`. |
| `getJobPosting` | Retrieve the full details of a single job posting by WID. **Parameters:** `jobPostingId` (required). |

## Connector networking configuration [workday-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [workday-api-credentials]

To use the Workday connector, you need to register an API client in Workday and create an Integration System User (ISU) with appropriate security permissions.

1. Log in to Workday as a system administrator.
2. Search for and open **Register API Client for Integrations**.
3. Enter a name for the client (for example, `Kibana Integration`).
4. From the **Client Grant Type** menu, select **Client Credentials**.
5. Add the required **Functional Areas** (at minimum: **Worker Data: Workers** for worker search, **Organizations** for org data, and **Staffing** for job postings).
6. Click **OK** and copy the **Client ID** and **Client Secret** that are displayed. Store the secret securely — Workday displays it only once.
7. Search for and open **View API Clients**. Find your client and copy the **Token Endpoint** URL.
8. Create an Integration System User (ISU):
   a. Search for **Create Integration System User** and create a new ISU.
   b. Search for **Manage: Security for Integration System User** and assign the ISU to an **Integration System Security Group (ISSG)**.
   c. Grant the ISSG domain security policies that cover the data you need (for example, **Get Worker**, **Get Organizations**, and **Get Job Postings**).
9. To configure the Kibana connector, enter:
   - **Tenant URL**: your Workday base URL (for example, `https://mycompany.workday.com`)
   - **Tenant Name**: your tenant identifier (for example, `mycompany`)
   - **Client ID** and **Client Secret** from step 6
   - **Token URL** from step 7
