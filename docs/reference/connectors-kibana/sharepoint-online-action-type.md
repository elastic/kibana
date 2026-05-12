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

SharePoint Online connectors support two Microsoft Entra ID authentication types. Choose one when you create or edit the connector:

- **OAuth 2.0 authorization code** — delegated, per-user access. The user signs in through {{kib}} and the connector acts on their behalf, constrained by their own SharePoint permissions.
- **OAuth Client Certificate (Microsoft Entra)** — app-only access signed with a JWT client assertion (PS256 + `x5t#S256`). The connector acts as the application itself, with the permissions granted to the app registration. This is Microsoft's recommended flow for production app-only access to Microsoft Graph.

::::{tip}
App-only (certificate) auth is recommended for production and for unattended/server-to-server scenarios. Use the authorization code flow when you need results scoped to a specific user's access.
::::

OAuth 2.0 authorization code
:   Delegated flow. In {{kib}} you provide:

    - **Authorization URL**: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize`
    - **Token URL**: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`
    - **Client ID**: the Application (client) ID from your Entra app registration
    - **Client Secret**: a client secret generated for the app registration

    Replace `{tenant-id}` with your Microsoft Entra tenant ID. The connector uses the default scope `Sites.Read.All Files.Read.All offline_access`. See [Get API credentials](#sharepoint-online-api-credentials) for the Entra app-registration steps.

OAuth Client Certificate (Microsoft Entra)
:   App-only flow using a signed JWT client assertion. In {{kib}} you provide:

    - **Token URL**: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`
    - **Client ID**: the Application (client) ID from your Entra app registration
    - **Certificate**: the PEM-encoded public X.509 certificate you uploaded to the app registration. Must begin with `-----BEGIN CERTIFICATE-----`.
    - **Private Key**: the PEM-encoded RSA private key that matches the uploaded certificate. Must begin with one of `-----BEGIN PRIVATE KEY-----` (PKCS#8), `-----BEGIN RSA PRIVATE KEY-----` (PKCS#1), or `-----BEGIN ENCRYPTED PRIVATE KEY-----` (encrypted PKCS#8). Stored encrypted at rest.
    - **Passphrase** (optional): only required if the private key is encrypted (`ENCRYPTED PRIVATE KEY`).

    The connector uses the default scope `https://graph.microsoft.com/.default`. See [Get API credentials](#sharepoint-online-api-credentials) for the Entra app-registration and certificate-upload steps.

#### OAuth authorization code (delegated auth)

Authorization URL
:   The Microsoft Entra ID authorization endpoint. Use the format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize`. Replace `{tenant-id}` with your Azure AD tenant ID.

Token URL
:   The Microsoft Entra ID token endpoint. Use the format: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`. Replace `{tenant-id}` with your Azure AD tenant ID.

## Test connectors [sharepoint-online-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by accessing the root SharePoint site.

The SharePoint Online connector has the following actions:

Search
:   Search for content across SharePoint sites, lists, and drives using the Microsoft Graph Search API.
    - `query` (required): The search query string (KQL syntax).
    - `entityTypes` (optional): Array of entity types to search. Valid values: `site`, `list`, `listItem`, `drive`, `driveItem`. Defaults to `[site]`.
    - `region` (optional): Search region (`NAM`, `EUR`, `APC`, `LAM`, `MEA`). Only used with app-only (certificate) auth and ignored with delegated auth. Defaults to `NAM` when using app-only auth.
    - `from` (optional): Offset for pagination.
    - `size` (optional): Number of results to return.

Get all sites
:   List all SharePoint sites the connector has access to. Behavior depends on auth type:

    - **App-only (certificate) auth**: calls `/sites/getAllSites` and returns every site the app has access to. The `search` parameter is ignored.
    - **Delegated (authorization code) auth**: `/sites/getAllSites` requires application permissions, so the connector falls back to `/sites?search=`. Provide a keyword or omit/`*` for a wildcard.

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

Both authentication types start with the same Entra app registration. The differences are in which credential type you add (client secret versus certificate) and which permission kind you grant (delegated versus application).

### Create the Entra app registration [sharepoint-online-entra-registration]

1. Go to the [Azure Portal](https://portal.azure.com/).
2. Go to **Microsoft Entra ID** > **App registrations**.
3. Select **New registration**.
4. Enter a name for your application.
5. Select **Accounts in this organizational directory only**.
6. Select **Register**.
7. From the app registration's **Overview**, copy the **Application (client) ID** and **Directory (tenant) ID**. You will need both when configuring the connector in {{kib}}.

### OAuth Client Certificate (Microsoft Entra) — recommended for production [sharepoint-online-cert-credentials]

This matches the **OAuth Client Certificate (Microsoft Entra)** authentication type in {{kib}}.

1. Grant **application** Microsoft Graph permissions:
   1. In the app registration, go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions**.
   2. Add the following permissions:
      - `Sites.Selected` — read items in selected site collections.
      - `Files.Read.All` — read files in all site collections.
      - `Sites.ReadWrite.All`, `Files.ReadWrite.All`, or both — only if write operations are needed.
   3. Select **Grant admin consent** for your organization.
2. Generate or obtain a certificate and its matching private key. The certificate can be self-signed (common for service-to-service scenarios) or CA-issued.

   For example, to generate a self-signed RSA certificate with OpenSSL:

   ```bash
   openssl req -x509 -newkey rsa:2048 -nodes \
     -keyout private_key.pem \
     -out certificate.pem \
     -days 365 \
     -subj "/CN=kibana-sharepoint-connector"
   ```

   Use `-nodes` only if you do not want the private key encrypted with a passphrase. Omit `-nodes` (and instead use `-passout`) if you prefer an encrypted PKCS#8 key.
3. Upload the certificate to the Entra app registration:
   1. In the app registration, go to **Certificates & secrets** → **Certificates** → **Upload certificate**.
   2. Upload the `.pem` (or `.cer`) public certificate from the previous step.
4. Enter the following values when configuring the connector in {{kib}}:
    - **Token URL**: `https://login.microsoftonline.com/{your-tenant-id}/oauth2/v2.0/token`
    - **Client ID**: the Application (client) ID copied above.
    - **Certificate**: paste the full contents of `certificate.pem` (including the `-----BEGIN CERTIFICATE-----` / `-----END CERTIFICATE-----` markers).
    - **Private Key**: paste the full contents of `private_key.pem` (including the BEGIN/END markers).
    - **Passphrase**: only if you generated an encrypted private key.

::::{tip}
Under the hood, the connector signs a JWT client assertion with the private key using `PS256` and sends it to the Entra token endpoint along with the certificate's SHA-256 thumbprint (`x5t#S256` header). The private key never leaves {{kib}}.
::::

### OAuth 2.0 authorization code — for per-user delegated access [sharepoint-online-oauth-code-credentials]

This matches the **OAuth 2.0 authorization code** authentication type in {{kib}}.

1. Add a redirect URI so Entra can return the user to {{kib}} after sign-in:
   1. In the app registration, go to **Authentication** → **Add a platform** → **Web**.
   2. Under **Redirect URIs**, add {{kib}}'s connector OAuth callback. Substitute your public {{kib}} hostname:

      ```text
      https://<your-kibana-host>/api/actions/connector/_oauth_callback
      ```

   3. Save the platform configuration.
2. Grant **delegated** Microsoft Graph permissions:
   1. In the app registration, go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**.
   2. Add the following permissions:
      - `Sites.Selected` — read items in selected site collections.
      - `Files.Read.All` — read files in site collections the signed-in user has access to.
      - `offline_access` — allow {{kib}} to refresh tokens without re-prompting the user.
   3. Select **Grant admin consent** if required by your tenant's policy.
3. Create a client secret:
   1. In the app registration, go to **Certificates & secrets** → **Client secrets** → **New client secret**.
   2. Enter a description and an expiration period.
   3. Copy the secret **Value** immediately — it is not retrievable after you leave the page.
4. Enter the following values when configuring the connector in {{kib}}:
    - **Authorization URL**: `https://login.microsoftonline.com/{your-tenant-id}/oauth2/v2.0/authorize`
    - **Token URL**: `https://login.microsoftonline.com/{your-tenant-id}/oauth2/v2.0/token`
    - **Client ID**: the Application (client) ID copied above.
    - **Client Secret**: the secret value you copied.
