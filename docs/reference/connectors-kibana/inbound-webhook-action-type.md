---
navigation_title: "Inbound Webhook"
type: reference
description: "Use the Inbound Webhook connector to receive JSON from any tool that can send an HTTP POST request, and start a Kibana workflow for each request."
applies_to:
  serverless: preview
  stack: preview 9.6
---

# Inbound Webhook connector [inbound-webhook-action-type]

The Inbound Webhook connector lets any tool that can send an HTTP `POST` request start {{kib}} workflows. The tool sends JSON to the connector's webhook URL. Each request starts the workflows that subscribe to the connector, and those workflows can read the request body. Use it with tools that have no built-in way to start a {{kib}} workflow, such as Prometheus Alertmanager, a CI/CD system, or an in-house service.

You can use this connector in **Workflows** only. It receives requests and has no actions, so workflows use it as a trigger, not as a step.

## Requirements [inbound-webhook-requirements]

To receive requests with this connector, you need:

- {applies_to}`serverless: preview` A [project feature tier](docs-content://deploy-manage/deploy/elastic-cloud/project-settings.md) that includes Workflows. The Security Analytics Essentials and Observability Logs Essentials tiers don't include it.
- {applies_to}`stack: preview 9.6+` An Enterprise license, which Workflows requires.
- {applies_to}`stack: preview 9.6+` The `xpack.actions.inboundEvents.enabled` setting in `kibana.yml` set to `true`, which is the default. When it's `false`, the Inbound Webhook connector type isn't available.
- A {{kib}} URL that the external tool can reach. A tool that runs outside your network can't send requests to `localhost`.

## Create connectors in {{kib}} [define-inbound-webhook-ui]

You can create connectors in **{{stack-manage-app}}** → **{{connectors-ui}}**.

### Connector configuration [inbound-webhook-connector-configuration]

Inbound Webhook connectors have the following configuration property:

Connector name
:   The name of the connector. Renaming the connector doesn't change its webhook URL or ingest token.

When you select **Save**, the flyout stays open and shows the **Webhook URL** and the **Ingest token**. {{kib}} shows the token only once. Copy it and store it with the URL before you close the flyout.

If the flyout warns that `server.publicBaseUrl` isn't set, the **Webhook URL** is a relative path that external tools can't use. Set [`server.publicBaseUrl`](/reference/configuration-reference/general-settings.md#server-publicbaseurl) to the {{kib}} host that the tool sends requests to.

## Connect an external tool [inbound-webhook-url]

Configure the external tool to send each event as an HTTP `POST` request with a JSON body to the connector's webhook URL. The URL uses one of the following formats. URLs in the default space have no `/s/<space-id>` prefix.

```text
https://<kibana-host>/api/actions/events/.inboundWebhook/<connector-id>
https://<kibana-host>/s/<space-id>/api/actions/events/.inboundWebhook/<connector-id>
```

Authenticate each request with the ingest token in one of these ways:

- If the tool lets you set headers, send an `Authorization: Bearer <ingest-token>` header. This method keeps the token out of URLs and logs.
- Append `?token=<ingest-token>` to the URL. {{kib}} reads this parameter only when the request has no `Authorization` header.

Some tools confirm a webhook URL by sending a verification value before they send events. When the JSON body has a top-level string field named `challenge`, the connector returns HTTP 200 with `{"challenge": "<value>"}` and doesn't start any workflows. The connector ignores a `challenge` field inside a nested object, so that request starts workflows as usual.

Protect the ingest token like a password. Anyone who has the token can start the connector's workflows, and those workflows run with the privileges of the last user who saved the connector.

### Rotate the ingest token [inbound-webhook-rotate-token]

If you lose the ingest token or someone else might have it, open the connector, select **Rotate ingest token**, then select **Rotate token** to confirm. The previous token stops working immediately, and {{kib}} shows the new token only once. Then update the external tool with the new token.

Rotating the token doesn't change which user the workflows run as. To run the workflows as a different user, have that user save the connector.

## Start a workflow from webhook requests [inbound-webhook-workflows]

To run a workflow for each request, add the `inboundWebhook.received` trigger to the workflow. The workflow editor lists this trigger as **Inbound Webhook - Received**. Set `connector-id` to the connector's ID, which is the last part of its webhook URL. To run the workflow for every Inbound Webhook connector in the space, set `connector-id` to `"*"`. Only enabled workflows in the same space as the connector run.

This workflow logs a message for each request that a specific connector receives:

```yaml
version: "1"
name: Log inbound webhook requests
enabled: true
triggers:
  - type: inboundWebhook.received
    connector-id: "<connector-id>"
steps:
  - name: log_request
    type: console
    with:
      message: "{{ event.body.alert_name }} is {{ event.body.status }} on {{ event.body.host }}"
```

Workflow steps can use these fields from the `event` object:

| Field | Description |
| --- | --- |
| `event.body` | The JSON body of the request, exactly as the tool sent it. |
| `event.connectorId` | The ID of the connector that received the request. |
| `event.connectorTypeId` | The connector type, `.inboundWebhook`. |
| `event.spaceId` | The space that the connector belongs to. |
| `event.correlationKey` | A unique ID that the connector creates for each request. |

To run a workflow for only some requests, add a {{kib}} Query Language (KQL) query on the `event` fields to `on.condition`. For example, this trigger runs only when the body's `status` field is `firing`:

```yaml
triggers:
  - type: inboundWebhook.received
    connector-id: "<connector-id>"
    on:
      condition: 'event.body.status : "firing"'
```

For more about triggers that run on events, refer to [Event-driven triggers](docs-content://explore-analyze/workflows/triggers/event-driven-triggers.md).

<!-- TODO: Link to the page about importing alerts from third-party tools with this connector once it's published. -->

### Test with a sample request [inbound-webhook-test]

To check the connection before you configure the external tool, send a sample request with `curl`:

```bash
curl -X POST \
  'https://<kibana-host>/api/actions/events/.inboundWebhook/<connector-id>' \
  -H 'Authorization: Bearer <ingest-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "alert_name": "High CPU",
    "status": "firing",
    "host": "web-1"
  }'
```

When {{kib}} accepts the request, it returns HTTP 202 with `{"ok": true}` and starts the subscribed workflows. To confirm that a workflow ran, open the workflow and select **Executions**.

## Troubleshoot webhook requests [inbound-webhook-troubleshoot]

The HTTP status that {{kib}} returns shows what happened to a request:

| Status | What it means |
| --- | --- |
| 202 | {{kib}} accepted the request. If no workflow runs, check that the workflow is enabled, is in the connector's space, has the correct `connector-id`, and has an `on.condition` that matches the body. |
| 200 | The body has a top-level `challenge` field. The connector answers the verification request and doesn't start any workflows. |
| 403 | This deployment doesn't accept webhook requests for any connector. |
| 404 | The ingest token is missing or incorrect, or someone rotated it. The URL might also have the wrong connector ID or space. After repeated failed attempts from one address, {{kib}} returns 404 for that connector for up to a minute, even when the token is correct. |
| 413 | The body is larger than the maximum size, which is 1 MB by default. |
| 429 | The tool sent too many requests. Wait for the number of seconds in the `Retry-After` response header, then send the request again. By default, each {{kib}} instance accepts up to 300 requests per minute for one connector, and up to 10 at the same time. |
