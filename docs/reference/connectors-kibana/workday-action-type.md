---
navigation_title: "Workday"
type: reference
description: "Access Workday HR data across workers, recruiting, learning, expenses, projects, and procurement with the Workday connector. Reference for OAuth 2.0 setup, connector configuration, and available actions."
applies_to:
  stack: preview
  serverless: preview
---

# Workday connector [workday-action-type]

The Workday connector connects directly to the Workday REST API. It enables AI agents to query workers, organizational structure, recruiting pipelines, learning catalogs, expenses, projects, procurement, and more from Workday HCM.

## Overview

The Workday connector uses Workday's REST API with OAuth 2.0 Authorization Code authentication (with non-expiring refresh tokens). To configure the connector, you provide your Workday tenant URL, tenant name, and OAuth credentials.

All actions are read-only. Compensation, payroll, personal contact information, performance ratings, and medical data are not accessible.

## Create connectors in {{kib}} [define-workday-ui]

You can create a Workday connector in **{{stack-manage-app}} > {{connectors-ui}}** or when you add a Workday data source.

### Connector configuration [workday-connector-configuration]

**Tenant URL**
:   The base URL of your Workday tenant, for example `https://mycompany.workday.com`.

**Tenant Name**
:   The tenant identifier used in API paths, for example `mycompany`. Typically, this matches the subdomain in your Workday URL.

**Authentication**
:   OAuth 2.0 Authorization Code with non-expiring refresh tokens. You need a **Client ID**, **Client Secret**, **Authorization URL**, and **Token URL** from a registered Workday API client scoped to an Integration System User (ISU).
    The authorization and token URLs follow the pattern:
    - `https://wd2-impl-services1.workday.com/ccx/oauth2/<tenantName>/authorize`
    - `https://wd2-impl-services1.workday.com/ccx/oauth2/<tenantName>/token`

## Available actions [workday-available-actions]

Actions are grouped by Workday functional area. Each group requires the corresponding OAuth scope (Functional Area) to be enabled on your Workday API client.

| Functional area | Actions | Required scope |
|-----------------|---------|----------------|
| Workers & org hierarchy | Search workers, get worker profile, get direct reports, list organizations, get organization | Worker Profile and Skills; Organizations and Roles |
| Staffing & inbox | List job postings, get job posting, list inbox tasks | Staffing; Tenant Non-Configurable |
| Time off & calendars | Get time-off balances, list absence types, list holidays | Time Off and Leave; Time Tracking |
| Recruiting | List job requisitions, get job requisition, list candidates | Recruiting |
| Learning | List courses, get course, list enrollments | Learning Core |
| Expenses | List expense reports, get expense report | Expenses |
| Self-service requests | List request types, list requests | Benefits; Tenant Non-Configurable |
| Journeys | List journeys | Journeys |
| Projects & revenue | List projects, get project, list project revenue | Projects; Project Billing; Project Tracking |
| Procurement | List purchase requisitions, get purchase requisition, list purchase orders | Procurement |
| Budgets | Check budget availability | Budgets |

## Connector networking configuration [workday-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [workday-api-credentials]

To use the Workday connector, you need to register an API client in Workday and create an Integration System User (ISU) with appropriate security permissions.

1. Log in to Workday as a system administrator.
2. Search for and open **Register API Client for Integrations**.
3. Enter a name for the client (for example, `Kibana Integration`).
4. From the **Client Grant Type** menu, select **Authorization Code Grant**.
5. Enable **PKCE**.
6. Add the **Functional Areas** corresponding to the action groups you want to enable (see the Available actions table above).
7. Click **OK** and copy the **Client ID** and **Client Secret** that are displayed. Store the secret securely — Workday displays it only once.
8. Search for and open **View API Clients**. Find your client and copy the **Authorization Endpoint** and **Token Endpoint** URLs.
9. To configure the Kibana connector, enter:
   - **Tenant URL**: your Workday base URL (for example, `https://mycompany.workday.com`)
   - **Tenant Name**: your tenant identifier (for example, `mycompany`)
   - **Client ID** and **Client Secret** from step 7
   - **Authorization URL** and **Token URL** from step 8
