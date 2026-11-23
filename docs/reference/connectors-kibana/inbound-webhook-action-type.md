---
navigation_title: "Inbound Webhook"
type: reference
description: "Use the Inbound Webhook connector to receive data from any tool that can send an HTTP POST request, and start a Kibana workflow for each request."
applies_to:
  serverless: preview
  stack: preview 9.6
---

# Inbound Webhook connector [inbound-webhook-action-type]

The Inbound Webhook connector lets any tool that can send an HTTP `POST` request start {{kib}} workflows. The tool sends data, such as JSON, to the connector's webhook URL. Each request starts the workflows that subscribe to the connector, and those workflows can read the request body. Use it with tools that have no built-in way to start a {{kib}} workflow, such as Prometheus Alertmanager, a CI/CD system, or an in-house service.

% TODO: After the docs-content page that this line links to is published, uncomment the following line.
% To import alerts from a monitoring tool into {{kib}} Universal Alerting, refer to [Import alerts from other monitoring tools](docs-content://explore-analyze/alerting/esql/alerts/import-alerts-from-other-tools.md).

You can use this connector in **Workflows** only. It receives requests and has no actions, so workflows use it as a trigger, not as a step. To learn how workflows start from events, refer to [Event-driven triggers](docs-content://explore-analyze/workflows/triggers/event-driven-triggers.md).

## Requirements [inbound-webhook-requirements]

To receive requests with this connector, you need:

- {applies_to}`serverless: preview` A [project feature tier](docs-content://deploy-manage/deploy/elastic-cloud/project-settings.md) that includes Workflows. The Security Analytics Essentials and Observability Logs Essentials tiers don't include it.
- {applies_to}`stack: preview 9.6+` An Enterprise license, which Workflows requires.
- {applies_to}`stack: preview 9.6+` The `xpack.actions.inboundEvents.enabled` setting in `kibana.yml` set to `true`, which is the default. When it's `false`, the Inbound Webhook connector type isn't available.
- A {{kib}} host that the external tool can reach over the network. A tool that runs outside your network can't send requests to `localhost` or to an address that only your network can reach.

## Create connectors in {{kib}} [define-inbound-webhook-ui]

To create an Inbound Webhook connector:

1. Go to the **{{connectors-ui}}** page using the navigation menu or the [global search field](docs-content://explore-analyze/find-and-organize/find-apps-and-objects.md), select **Create connector**, then select **Inbound Webhook**.
2. In **Connector name**, enter a name that identifies the tool that sends the requests, such as Zabbix production. {{kib}} fills in **Connector ID** from the name as you type.
3. (Optional) Check **Connector ID**. It becomes part of the webhook URL, and workflows use it to subscribe to the connector. You can't change it after you save, so edit it now if you want a different one.

    The ID can be up to 36 characters long and contain only lowercase letters, numbers, and hyphens, and it must start and end with a letter or number.

4. Save the connector.
5. Under **Connector settings**, copy the provided webhook URL and token. Save them somewhere secure, such as a password manager. The external tool needs both this token and the webhook URL to send requests.

    {{kib}} only shows the token once. If you lose it, [rotate the token](#inbound-webhook-rotate-token) to get a new one.

If [`server.publicBaseUrl`](/reference/configuration-reference/general-settings.md#server-publicbaseurl) isn't set, the flyout shows a warning and the **Webhook URL** has no host, such as `/api/actions/events/.inboundWebhook/<connector-id>`. The setting only changes the URL that the flyout shows, not whether {{kib}} accepts requests. To get a full URL that the external tool can use, do one of the following:

- Add the URL that the tool uses to reach {{kib}} to the start of the path. Include your `server.basePath` value if you set one. For example: `https://kibana.example.com/api/actions/events/.inboundWebhook/<connector-id>`.
- Set `server.publicBaseUrl` so that the flyout shows the full URL:

    1. In `kibana.yml`, set `server.publicBaseUrl` to the URL that the tool uses to reach {{kib}}, such as `https://kibana.example.com`. Include the protocol, the host, the port if it isn't the default for the protocol, and your `server.basePath` value if you set one. Don't add a query string. Leave the URL unquoted or use straight quotation marks, because curly quotation marks become part of the URL.
    2. Restart {{kib}}.
    3. Open the connector again and copy the **Webhook URL**. Don't rotate the token. You can keep using the one you copied when you saved the connector.

### Connector configuration [inbound-webhook-connector-configuration]

Inbound Webhook connectors have the following configuration properties:

Connector name
:   The name that the connectors list shows. You can change it at any time without changing the connector's ID, webhook URL, or ingest token.

Connector ID
:   A unique ID that {{kib}} fills in from the name. You can change it before you save the connector, but not afterward. It can be up to 36 characters long and contain only lowercase letters, numbers, and hyphens, and it must start and end with a letter or number. The ID is the last part of the [webhook URL](#inbound-webhook-url-format), and workflows use it to subscribe to the connector.

## Connect an external tool [inbound-webhook-url]

Configure the external tool to send its data as HTTP `POST` requests to the connector's webhook URL, and to authenticate with the connector's ingest token.

### Webhook URL [inbound-webhook-url-format]

The URL uses one of the following formats. URLs in the default space have no `/s/<space-id>` prefix.

```text
https://<kibana-host>/api/actions/events/.inboundWebhook/<connector-id>
https://<kibana-host>/s/<space-id>/api/actions/events/.inboundWebhook/<connector-id>
```

### Request body [inbound-webhook-request-body]

Set the request's `Content-Type` header to one of the following types. {{kib}} parses the body and passes the result to workflows as `event.body`:

| Content type | `event.body` |
| --- | --- |
| `application/json`, or a type that ends in `+json`, such as `application/cloudevents+json` | The parsed JSON value |
| `application/x-www-form-urlencoded` | An object of the form fields |
| `text/plain` | The body as a string |

### Authenticate requests [inbound-webhook-authenticate]

The ingest token is a secret that {{kib}} creates when you save the connector, and again each time you rotate it. It authenticates requests to the webhook URL. Authenticate each request with the ingest token in one of these ways:

- If the tool lets you set headers, send an `Authorization: Bearer <ingest-token>` header. This method keeps the token out of URLs and logs.
- Append `?token=<ingest-token>` to the URL. {{kib}} reads this parameter only when the request has no `Authorization` header.

:::{warning}
Protect the ingest token like a password. Anyone who has the token can start the connector's workflows, and those workflows run with the privileges of the last user who saved the connector.
:::

### Verification requests [inbound-webhook-verification]

Some tools send a verification request to confirm a webhook URL before they send data. The connector answers with HTTP 200 and `{"challenge": "<value>"}`, where `<value>` is the value that the tool sent, and doesn't start any workflows.

The connector treats a request as a verification request when both of these are true:

- The body has a top-level `challenge` field.
- The field's value is a string of 1 to 1,024 characters.

Any other request with a `challenge` field, such as one with an empty string or with the field inside a nested object, starts workflows as usual.

### Rotate the ingest token [inbound-webhook-rotate-token]

If you lose the ingest token or someone else might have it, rotate it:

1. Open the connector and select **Rotate ingest token**.
2. Select **Rotate token** to confirm. The previous token stops working immediately.
3. Copy the new token. {{kib}} shows it only once.
4. Update the external tool with the new token.

Rotating the token doesn't change which user the workflows run as. To run the workflows as a different user, have that user save the connector.

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
| 200 | The connector answered a [verification request](#inbound-webhook-verification) and didn't start any workflows. |
| 202 | {{kib}} accepted the request. If no workflow runs, refer to [No workflow runs after a 202 response](#inbound-webhook-no-workflow). |
| 403 | This deployment doesn't accept webhook requests for any connector. |
| 404 | {{kib}} rejected the URL or the token. For possible causes, refer to [Requests return 404](#inbound-webhook-404). |
| 413 | The body is larger than the maximum size, which is 1 MB by default. |
| 429 | The tool sent too many requests. Refer to [Requests return 429](#inbound-webhook-429). |

### No workflow runs after a 202 response [inbound-webhook-no-workflow]

If {{kib}} accepts a request but no workflow runs, check that the workflow:

- Is enabled.
- Is in the same space as the connector.
- Has a trigger whose `connector-id` is the connector's ID or `"*"`.
- Has an `on.condition` that matches the request body, if it has one.

### Requests return 404 [inbound-webhook-404]

A 404 response has one of these causes:

- The ingest token is missing or incorrect, or someone rotated it.
- The URL has the wrong connector ID or space.
- The address that sends the requests had too many failed attempts. {{kib}} returns 404 for that connector until the [failed-authentication window](/reference/configuration-reference/alerting-settings.md#xpack-actions-inboundevents-ratelimit-remoteaddress-window) passes, even when the token is correct.
- [`xpack.actions.inboundEvents.enabled`](/reference/configuration-reference/alerting-settings.md#xpack-actions-inboundevents-enabled) is `false`. In this case, every webhook URL returns 404.

### Requests return 429 [inbound-webhook-429]

Wait for the number of seconds in the `Retry-After` response header, then send the request again.

When a request exceeds one of these limits, {{kib}} returns 429. Each {{kib}} process applies the limits separately:

- [Authenticated requests per minute for one connector](/reference/configuration-reference/alerting-settings.md#xpack-actions-inboundevents-ratelimit-connector-limit)
- [Requests in progress at once for one connector](/reference/configuration-reference/alerting-settings.md#xpack-actions-inboundevents-admission-maxinflightperconnector)
- [Requests in progress at once across all connectors](/reference/configuration-reference/alerting-settings.md#xpack-actions-inboundevents-admission-maxinflight)
