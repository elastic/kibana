---
navigation_title: "GraphQL"
type: reference
description: "Use the GraphQL connector to run queries and mutations, and introspect schemas on any GraphQL API endpoint."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# GraphQL connector [graphql-action-type]

The GraphQL connector lets AI agents run queries and introspect the schema of any GraphQL API endpoint.

## Create connectors in {{kib}} [define-graphql-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [graphql-connector-configuration]

GraphQL connectors have the following configuration properties:

GraphQL endpoint URL
:   The URL of your GraphQL API. All operations are sent as HTTP POST requests to this URL.
    Example: `https://api.example.com/graphql`

Authentication
:   Choose the authentication method that matches your GraphQL service:

    No authentication
    :   No credentials are sent. Use this for public GraphQL endpoints.

    Basic authentication
    :   A username and password sent with HTTP Basic authentication.

    Bearer token
    :   An OAuth access token, JWT, or API access token sent as `Authorization: Bearer <token>`.

    OAuth 2.0 authorization code
    :   An authorization URL, token URL, client ID, and client secret. You authorize in the browser; the connector stores and refreshes tokens and sends the access token as a Bearer token. An optional scope may be required by your provider.

    OAuth 2.0 client credentials
    :   A token URL, client ID, and client secret. The connector exchanges these for an access token and sends it as a Bearer token. An optional scope may be required by your provider.

## Test connectors [graphql-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test sends a minimal introspection probe (`{ __typename }`) to the configured endpoint to verify connectivity and authentication.

## Actions [graphql-actions]

The GraphQL connector provides the following actions:

Introspect
:   Introspects the GraphQL schema to discover available types, queries, and mutations. Returns a structured summary of all user-defined types with their fields and input arguments. Call this before writing queries when you are unfamiliar with the API.
    - **Include built-ins** (optional): If true, includes built-in scalar types (`String`, `Int`, `Float`, `Boolean`, `ID`) and introspection meta-types (prefixed with `__`) in the response. Defaults to false.

Query
:   Executes a read-only GraphQL query. Returns the `data` field from the GraphQL response. Throws if the server returns any GraphQL `errors`.
    - **Query** (required): The GraphQL query document string. Example: `{ users { id name email } }`.
    - **Variables** (optional): A key/value map of variables to pass to the query. Example: `{ "id": "123" }`.
    - **Operation name** (optional): The name of the operation to execute when the document contains multiple named operations.

Mutation
:   Runs a GraphQL mutation to create, update, or delete data. Not exposed as an agent tool. Returns the `data` field from the GraphQL response. Throws if the server returns any GraphQL `errors`.
    - **Mutation** (required): The GraphQL mutation document string. Example: `mutation CreateUser($name: String!) { createUser(name: $name) { id name } }`.
    - **Variables** (optional): A key/value map of variables to pass to the mutation. Example: `{ "name": "Alice" }`.
    - **Operation name** (optional): The name of the operation to execute when the mutation document contains multiple named operations.

## Connector networking configuration [graphql-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings.
You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [graphql-api-credentials]

Authentication requirements vary by GraphQL service. Choose the auth type that matches your provider's documentation:

1. **No authentication** — Leave credentials empty for public endpoints that do not require auth.
2. **Basic authentication** — Use the username and password (or email and API token) required by your GraphQL service.
3. **Bearer token** — Obtain an OAuth access token, JWT, or API token from your service and paste it into the Bearer token field. Common for GitHub, Shopify, Contentful, and many SaaS GraphQL APIs.
4. **OAuth 2.0 authorization code** — Register an OAuth application with your provider, enter the authorization URL, token URL, client ID, and client secret, then complete the authorize flow in {{kib}}. Optionally set the scope if your provider requires it. The access token is sent as a Bearer token.
5. **OAuth 2.0 client credentials** — Register an OAuth application with your provider, then enter the token URL, client ID, and client secret. Optionally set the scope if your provider requires it.
