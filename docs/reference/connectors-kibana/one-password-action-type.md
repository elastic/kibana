---
navigation_title: "1Password"
applies_to:
  stack: preview 9.4
  serverless: preview
---

# 1Password connector [one-password-action-type]

The 1Password connector uses the [1Password Users API](https://developer.1password.com) to manage users in a 1Password Enterprise Password Manager account. It enables security teams to automate identity-level response actions — such as suspending compromised users — directly from Elastic Security workflows.

## Create connectors in {{kib}} [define-one-password-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [one-password-connector-configuration]

1Password connectors have the following configuration properties:

Account UUID
:   The UUID of your 1Password account. You can find this in the 1Password admin console.

Client ID
:   The OAuth 2.0 Client ID for your 1Password integration.

Client Secret
:   The OAuth 2.0 Client Secret for your 1Password integration.

The connector authenticates using the OAuth 2.0 Client Credentials flow with `client_secret_basic` authentication. The token URL and scope are derived automatically.

## Test connectors [one-password-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The 1Password connector has the following actions:

List Users
:   List users in the 1Password account, optionally filtered by state.
    - **filter** (optional): Filter expression — `user.isActive()` or `user.isSuspended()`. Omit to return all users.
    - **maxPageSize** (optional): Maximum number of users to return in a single response.
    - **pageToken** (optional): Token to fetch the next page of results.

Get User
:   Retrieve details for a single user by their UUID.
    - **uuid** (required): The UUID of the user.

Suspend User
:   Suspend an active user, preventing them from accessing the 1Password account. Vault access configuration remains intact.
    - **uuid** (required): The UUID of the user to suspend.

Reactivate User
:   Reactivate a suspended user, restoring their access to the 1Password account.
    - **uuid** (required): The UUID of the user to reactivate.

## Connector networking configuration [one-password-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [one-password-api-credentials]

To use the 1Password connector, you need OAuth 2.0 client credentials from a 1Password Enterprise Password Manager account:

1. Log in to your 1Password account as an Admin, Owner, or Security group member.
2. Navigate to **Integrations > OAuth Applications** and create a new application.
3. Configure the application with the required scopes: **List users**, **List user**, **Suspend user**, **Reactivate user**.
4. Save the **Client ID** and **Client Secret**. You will not be able to retrieve the secret later.
5. Copy your **Account UUID** from the admin console URL or account settings.
6. When configuring the connector in {{kib}}, enter the Account UUID, Client ID, and Client Secret.
