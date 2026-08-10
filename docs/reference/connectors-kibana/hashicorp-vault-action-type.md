---
navigation_title: "HashiCorp Vault"
type: reference
description: "Use the HashiCorp Vault connector to read secrets from a Vault KV version 2 secrets engine when provisioning other connectors from a Workflow."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# HashiCorp Vault connector [hashicorp-vault-action-type]

The HashiCorp Vault connector reads secrets from a [Vault KV version 2 secrets engine](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2). It exists to support a single use case: resolving credentials from Vault inside a Workflow so they can be used to create or update another Kibana connector, without a human ever seeing or handling the plaintext value.

::::{important}
This connector is **not** a general-purpose data source for [Elastic Agent Builder](docs-content://explore-analyze/ai-features/elastic-agent-builder.md) or the Assistant. Its `readSecret` action is deliberately excluded from tool/LLM access, and any Workflow step or API caller that receives its output must not forward that value to Agent Builder context, workflow execution history, or any other logging or display surface. Use it only through the `connector-provisioning.provisionConnectorFromSecret` Workflow step, which is built specifically to keep Vault-sourced values out of those surfaces.
::::

## Create connectors in {{kib}} [define-hashicorp-vault-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [hashicorp-vault-connector-configuration]

HashiCorp Vault connectors have the following configuration properties:

Vault address
:   The base URL of your Vault server, for example `https://vault.example.com:8200`. Must use `https`, with no path, query string, or embedded credentials. This host must be permitted by the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting.

Vault namespace
:   Optional. A Vault Enterprise namespace to scope requests to (sent as the `X-Vault-Namespace` header). Leave empty if you do not use Vault namespaces.

### Authentication [hashicorp-vault-connector-authentication]

The connector supports two authentication methods:

**Vault token**

Vault token
:   A Vault token with read access to the secrets this connector will fetch, sent as the `X-Vault-Token` header. Its lifetime and renewal are governed entirely by Vault: if it isn't a periodic/renewable token, or isn't kept alive by an external process, requests eventually fail with a 403 once it expires.

**AppRole**

Role ID / Secret ID
:   Credentials for Vault's [AppRole auth method](https://developer.hashicorp.com/vault/docs/auth/approle), suited to unattended, machine-to-machine use. The connector exchanges these for a short-lived Vault token via a login request, and transparently re-logs in when that token expires — there is no `refresh_token` concept, so a fresh Role ID/Secret ID login always follows expiry.

Mount path
:   The path AppRole is mounted at. Defaults to `approle`. Confirm the correct value with the Vault instance operator: some deployments mount AppRole at a non-default path or require a specific Enterprise namespace.

::::{note}
Vault OIDC/OAuth authentication is **not available** in this connector, regardless of deployment. The OIDC authorization-code flow requires an interactive user agent (a browser redirecting through an identity provider's login page); it cannot be driven by an unattended Workflow step with no human in the loop, which is this connector's only supported use case. Use **Vault token** or **AppRole** instead.
::::

## Test connectors [hashicorp-vault-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies the configured credentials by checking the token's validity with Vault (`GET /v1/auth/token/lookup-self`).

The HashiCorp Vault connector has a single action, `readSecret`, which reads a secret (or one field of a secret) from a KV version 2 path. This action is not exposed to Agent Builder or the Assistant, and is intended to be called only from the `connector-provisioning.provisionConnectorFromSecret` Workflow step — see [Provision a connector from a Vault secret](#hashicorp-vault-provisioning-example) below.

## Connector networking configuration [hashicorp-vault-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations. Because Vault is often reachable only on an internal or private hostname, make sure the Vault address is permitted by `xpack.actions.allowedHosts`.

Only KV version 2 secrets engines are supported. KV version 1 responses have a different shape and are rejected with an error identifying the mismatch.

## Get API credentials [hashicorp-vault-api-credentials]

**Vault token**

1. In Vault, create or identify a token with read access to only the paths this connector needs, for example via a scoped policy attached to `vault token create -policy=<policy-name>`.
2. Prefer a periodic or otherwise renewable token, and arrange for it to be kept alive, since this connector does not renew tokens on your behalf.
3. Enter the Vault address and the token when configuring the connector in {{kib}}.

**AppRole**

1. Enable and configure the AppRole auth method in Vault, for example `vault auth enable approle` (or note the mount path if it's already enabled elsewhere).
2. Create a role scoped to only the policies this connector needs: `vault write auth/approle/role/<role-name> token_policies="<policy-name>" token_ttl=1h token_max_ttl=4h`.
3. Retrieve the Role ID and generate a Secret ID:
   ```sh
   vault read auth/approle/role/<role-name>/role-id
   vault write -f auth/approle/role/<role-name>/secret-id
   ```
4. Enter the Vault address, Role ID, Secret ID, and mount path (if non-default) when configuring the connector in {{kib}}.

## Provision a connector from a Vault secret [hashicorp-vault-provisioning-example]

The intended way to use this connector is from a Workflow, via the `connector-provisioning.provisionConnectorFromSecret` step, which reads one or more fields from Vault and uses them to create or update another connector without ever surfacing the resolved values:

```yaml
- name: provisionCloudConnector
  type: connector-provisioning.provisionConnectorFromSecret
  with:
    vaultConnectorId: "hashicorp-vault-connector"
    targetConnectorTypeId: ".some_cloud_provider"
    targetConnectorName: "Cloud Provider - prod"
    authType: "oauth_client_credentials"
    targetConnectorConfig:
      region: "eu-west-1"                        # non-secret config, stored in cleartext
    targetConnectorSecrets:
      tokenUrl: "https://auth.cloudprovider.example/oauth/token"  # non-credential, but stored in cleartext in the workflow — never put a real secret here
    fieldBindings:
      - path: "secret/data/infra/cloud-prod" # auto-matches Vault fields to the target's *secrets* by name, e.g. clientId, clientSecret
    mode: upsert
    targetConnectorId: "cloud-provider-prod"
```

::::{warning}
Only values read from Vault (via `fieldBindings`) are treated as secrets and stored encrypted. The `targetConnectorConfig` and `targetConnectorSecrets` values are literals written directly in the Workflow definition, so they are persisted in cleartext in both the workflow and its execution history. Use them only for non-sensitive, structural values (for example a fixed `region` or `tokenUrl`); put every real credential in Vault and reference it through `fieldBindings`. For the same reason, `fieldBindings` may only populate the target connector's **secrets** fields — a Vault value is never written into a cleartext config field, and a binding that targets a config field is rejected.
::::

Whoever triggers or schedules the workflow needs "Actions and Connectors: Read" (to read the Vault secret) and "Actions and Connectors: All" (to create or update the target connector) in that space — these are checked independently of any Workflows-specific privileges. The Vault connector and the target connector must both live in the same space as the triggering/scheduling identity; cross-space provisioning isn't supported.
