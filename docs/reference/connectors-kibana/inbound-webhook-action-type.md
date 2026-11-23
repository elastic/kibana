---
navigation_title: "Inbound Webhook"
type: reference
description: "Use the Inbound Webhook connector to receive data from any tool that can send an HTTP POST request, and start Kibana workflows from each request."
applies_to:
  serverless: preview
  stack: preview 9.6
---

# Inbound Webhook connector [inbound-webhook-action-type]

The Inbound Webhook connector lets any tool that can send an HTTP `POST` request start {{kib}} workflows. Each request starts the workflows that subscribe to the connector, and those workflows can read the request body. Use it with tools that have no built-in way to start a {{kib}} workflow, such as Prometheus Alertmanager, a CI/CD system, or an in-house service.

% TODO: After the docs-content page that this line links to is published, uncomment the following line.
% To import alerts from a monitoring tool into {{kib}} Universal Alerting, refer to [Import third-party alerts into {{kib}} Universal Alerting](docs-content://explore-analyze/alerting/esql/alerts/import-third-party-alerts.md).

You can use this connector in **Workflows** only, as a trigger rather than a step.

## Requirements [inbound-webhook-requirements]

To receive requests with this connector, you need:

- On {{serverless-full}}, a [project feature tier](docs-content://deploy-manage/deploy/elastic-cloud/project-settings.md) that includes Workflows. The Security Analytics Essentials and Observability Logs Essentials tiers don't include it.
- On {{stack}}, an Enterprise license, which Workflows requires.
- {applies_to}`stack: preview 9.6+` The `xpack.actions.inboundEvents.enabled` setting in `kibana.yml` set to `true`, which is the default. When it's `false`, the Inbound Webhook connector type isn't available.
- A {{kib}} URL that the external tool can reach.

## Create connectors in {{kib}} [define-inbound-webhook-ui]

To create an Inbound Webhook connector:

1. Go to the **{{connectors-ui}}** page using the navigation menu or the [global search field](docs-content://explore-analyze/find-and-organize/find-apps-and-objects.md).
2. Select **Create connector**, then **Inbound Webhook connector**.
3. In **Connector name**, enter a name that identifies the tool that sends the requests, such as Zabbix production. {{kib}} fills in **Connector ID** from the name. If you want a different ID, edit it now, because you can't change it after you save. For the ID rules, refer to [Connector configuration](#inbound-webhook-connector-configuration).
4. Save the connector.
5. In **Connector settings**, copy the **Webhook URL** and the **Ingest token**. Save them somewhere secure, such as a password manager.

    {{kib}} shows the ingest token only once. If you lose it, [rotate the token](#inbound-webhook-rotate-token) to get a new one.

:::{dropdown} If the flyout warns that the webhook URL is missing the {{kib}} host, add the host so that external tools can reach the URL.

Follow these steps:

1. In `kibana.yml`, set [`server.publicBaseUrl`](/reference/configuration-reference/general-settings.md#server-publicbaseurl) to the URL that the tool uses to reach {{kib}}, such as `https://kibana.example.com`.

    Include the protocol, the host, the port if it isn't the default for the protocol, and your `server.basePath` value if you set one. Don't add a query string. Leave the URL unquoted or use straight quotation marks, because curly quotation marks become part of the URL.
2. Restart {{kib}}.
3. Open the connector again and copy the **Webhook URL**. The ingest token that you copied earlier still works.

If you can't change `kibana.yml`, add the URL that the tool uses to reach {{kib}} to the start of the webhook path instead. Include your `server.basePath` value if you set one. For the full format, refer to [Webhook URL](#inbound-webhook-url-format).

:::

### Connector configuration [inbound-webhook-connector-configuration]

Inbound Webhook connectors have the following configuration properties:

Connector name
:   The name that the connectors list shows. You can change it at any time without changing the connector's ID, webhook URL, or ingest token.

Connector ID
:   A unique ID that {{kib}} fills in from the name. You can change it before you save the connector, but not afterward. It can be up to 36 characters long and contain only lowercase letters, numbers, and hyphens, and it must start and end with a letter or number. The ID is the last part of the [webhook URL](#inbound-webhook-url-format), and workflows use it to subscribe to the connector.

## Start a workflow from the connector [inbound-webhook-start-workflow]

To start a workflow from the connector's requests, add an `inboundWebhook.received` trigger with the connector's ID to the workflow:

```yaml
triggers:
  - type: inboundWebhook.received
    connector-id: "<connector-id>"
```

% TODO: After the docs-content page that this line links to is published, uncomment the following line.
% For an example workflow that creates an alert from each request, refer to [Import alerts from other tools](docs-content://explore-analyze/alerting/esql/alerts/import-third-party-alerts.md#import-alerts-other-tools).

## Test with a sample request [inbound-webhook-test]

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

## Connect an external tool [inbound-webhook-url]

After the sample request works, set up the external tool's webhook or notification settings to send requests to the connector. Each tool names these settings differently, so use the tool's documentation to find where to enter the following values.

### Webhook URL [inbound-webhook-url-format]

Enter the webhook URL that you copied when you created the connector. The URL uses one of the following formats. URLs in the default space have no `/s/<space-id>` prefix. If you set `server.basePath`, add it after `<kibana-host>`.

```text
https://<kibana-host>/api/actions/events/.inboundWebhook/<connector-id>
https://<kibana-host>/s/<space-id>/api/actions/events/.inboundWebhook/<connector-id>
```

### Request body [inbound-webhook-request-body]

Set the request's `Content-Type` header to one of the following types. {{kib}} parses the body and passes the result to workflows as `event.body`:

| Content type | `event.body` |
| --- | --- |
| `application/json` | The parsed JSON value |
| `application/x-www-form-urlencoded` | An object of the form fields |
| `text/plain` | The body as a string |

If the request has no `Content-Type` header, {{kib}} parses the body as JSON. Requests with any other content type return HTTP 415.

### Authenticate requests [inbound-webhook-authenticate]

The ingest token is a secret that {{kib}} creates when you create the connector, and again each time you rotate it. Send it with each request in one of these ways:

- If the tool lets you set headers, send an `Authorization: Bearer <ingest-token>` header. This method keeps the token out of URLs.
- If the tool can't set headers, append `?token=<ingest-token>` to the URL. {{kib}} reads this parameter only when the request has no `Authorization` header.

:::{warning}
Protect the ingest token like a password. Anyone who has the token can start the connector's workflows, and those workflows run with the privileges of the last user who saved the connector. To run them as a different user, have that user open the connector, make a change such as editing its name, and save it. **Save** stays disabled until something changes.
:::

### Verification requests [inbound-webhook-verification]

Some tools send a verification request to confirm a webhook URL before they send data. The connector answers with HTTP 200 and `{"challenge": "<value>"}`, where `<value>` is the value that the tool sent, and doesn't start any workflows.

The connector treats a request as a verification request when the body has a top-level `challenge` field whose value is a string of 1 to 1,024 characters.

## Rotate the ingest token [inbound-webhook-rotate-token]

If you lose the ingest token or someone else might have it, rotate it:

1. Open the connector and select **Rotate ingest token**.
2. Select **Rotate token** to confirm. The previous token stops working immediately.
3. Copy the new token. {{kib}} shows it only once.
4. Update the external tool with the new token.

## Troubleshoot webhook requests [inbound-webhook-troubleshoot]

The response that the tool gets shows what happened to a request:

| Status | What it means |
| --- | --- |
| No response | The tool couldn't connect to {{kib}}, such as a connection error or a timeout. Refer to [Requests don't reach {{kib}}](#inbound-webhook-unreachable). |
| 200 | The connector answered a [verification request](#inbound-webhook-verification) and didn't start any workflows. |
| 202 | {{kib}} accepted the request. If no workflow runs, refer to [No workflow runs after a 202 response](#inbound-webhook-no-workflow). |
| 400 | The request is invalid, such as a body that isn't valid JSON, a connector ID that's too long, or an empty `token` query parameter. The response message says which part to fix. |
| 404 | {{kib}} rejected the URL or the token. For possible causes, refer to [Requests return 404](#inbound-webhook-404). |
| 413 | The body is larger than the maximum size, which is 1 MB by default. Configure the tool to send a smaller body. |
| 415 | The connector doesn't accept the request's content type. Set the `Content-Type` header to one of the types in [Request body](#inbound-webhook-request-body). |
| 429 | The tool sent too many requests. Refer to [Requests return 429](#inbound-webhook-429). |
| 500 | {{kib}} couldn't process the request. Send the request again. If it keeps failing, check the {{kib}} logs for an error that starts with `Inbound events outcome=` and includes the connector ID. The line's `detail` field shows the cause. |

### Requests don't reach {{kib}} [inbound-webhook-unreachable]

If the sample request works but the tool's requests fail with a connection error or a timeout, the tool can't reach your {{kib}} URL. For example, a tool hosted on the internet can't send requests to `localhost` or to an address that works only inside your network.

To fix it, configure the tool with a {{kib}} URL that it can reach from where it runs. If {{kib}} is reachable only inside your network, make it reachable from the tool's network, for example through a reverse proxy.

### No workflow runs after a 202 response [inbound-webhook-no-workflow]

If {{kib}} accepts a request but no workflow runs, check that the workflow:

- Is enabled.
- Is in the same space as the connector.
- Has a trigger whose `connector-id` is the connector's ID or `"*"`.
- Has no `on.condition`, or has one that matches the request body.

If the workflow passes these checks, {{kib}} might not have a user to run it as. Open the connector, make a change such as editing its name, and save it. **Save** stays disabled until something changes.

### Requests return 404 [inbound-webhook-404]

A 404 response has one of these causes:

- The ingest token is missing or incorrect, or someone rotated it. Copy the current token into the tool again. If you no longer have it, [rotate the token](#inbound-webhook-rotate-token).
- The tool sends its own `Authorization` header, such as for basic authentication, and the token in a `?token=` query parameter. {{kib}} ignores the query parameter when the request has an `Authorization` header. Remove the tool's `Authorization` header, or send the token as `Authorization: Bearer <ingest-token>` instead.
- The URL has the wrong connector ID or space. Copy the **Webhook URL** from the connector again.
- The address that sends the requests made too many failed authentication attempts, which is 10 within 1 minute by default. {{kib}} returns 404 for that connector until the [failed-authentication window](/reference/configuration-reference/alerting-settings.md#xpack-actions-inboundevents-ratelimit-remoteaddress-window) passes, even when the token is correct. Fix the token in the tool, then wait for the window to pass.
- [`xpack.actions.inboundEvents.enabled`](/reference/configuration-reference/alerting-settings.md#xpack-actions-inboundevents-enabled) is `false`. In this case, every webhook URL returns 404. Set it to `true` in `kibana.yml` and restart {{kib}}.

### Requests return 429 [inbound-webhook-429]

Wait for the number of seconds in the `Retry-After` response header, then send the request again.

{{kib}} returns 429 when a request exceeds one of the following limits, which each {{kib}} process applies separately:

- [Authenticated requests per minute for one connector](/reference/configuration-reference/alerting-settings.md#xpack-actions-inboundevents-ratelimit-connector-limit)
- [Requests in progress at once for one connector](/reference/configuration-reference/alerting-settings.md#xpack-actions-inboundevents-admission-maxinflightperconnector)
- [Requests in progress at once across all connectors](/reference/configuration-reference/alerting-settings.md#xpack-actions-inboundevents-admission-maxinflight)

If the tool keeps exceeding a limit, configure it to spread out its requests or, on {{stack}}, raise the matching setting.
