---
navigation_title: "{{webhook-cm}}"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/cases-webhook-action-type.html
applies_to:
  stack: all
  serverless:
    observability: ga
    security: ga
---

# {{webhook-cm}} connector and action [cases-webhook-action-type]

The {{webhook-cm}} connector uses [axios](https://github.com/axios/axios) to send POST, PUT, and GET requests to a case management RESTful API web service.

## Create connectors in {{kib}} [define-cases-webhook-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you’re creating a rule. In the first step, you must provide a name for the connector and its authentication details. For example:

:::{image} ../images/cases-webhook-connector.png
:alt: Set authentication details in the {{webhook-cm}} connector
:screenshot:
:::

In the second step, you must provide the information necessary to create cases in the external system. For example:

:::{image} ../images/cases-webhook-connector-create-case.png
:alt: Add case creation details in the {{webhook-cm}} connector
:screenshot:
:::

In the third step, you must provide information related to retrieving case details from the external system. For example:

:::{image} ../images/cases-webhook-connector-get-case.png
:alt: Add case retrieval details in the {{webhook-cm}} connector
:screenshot:
:::

In the fourth step, you must provide information necessary to update cases in the external system. You can also optionally provide information to add comments to cases. For example:

:::{image} ../images/cases-webhook-connector-comments.png
:alt: Add case update and comment details in the {{webhook-cm}} connector
:screenshot:
:::

### Connector configuration [cases-webhook-connector-configuration]

{{webhook-cm}} connectors have the following configuration properties:

Authentication
:   The authentication type: none, basic, or SSL. If you choose basic authentication, you must provide a user name and password. If you choose SSL authentication, you must provide SSL server certificate authentication data in a CRT and key file format or a PFX file format. You can also optionally provide a passphrase if the files are password-protected.

Certificate authority
:   A certificate authority (CA) that the connector can trust, for example to sign and validate server certificates. This option is available for all authentication types. You can choose from the following verification modes:

    * `Full`: Validate that the certificate has an issue date within the `not_before` and `not_after` dates, chains to a trusted certificate authority, and has a hostname or IP address that matches the names within the certificate.
    * `Certificate`: Validate that the certificate it is signed by a trusted authority. This option does not check the certificate hostname.
    * `None`: Skip certificate validation.

Create case method
:   The REST API HTTP request method to create a case in the third-party system: `post`(default), `put`, or `patch`.

Create case object
:   A JSON payload sent to the create case URL to create a case. Use the variable selector to add case data to the payload. Required variables are `case.title` and `case.description`. For example:

    ```json
    {
    	"fields": {
    	  "summary": {{{case.title}}},
    	  "description": {{{case.description}}},
    	  "labels": {{{case.tags}}}
    	}
    }
    ```

    ::::{note}
    Due to Mustache template variables (the text enclosed in triple braces, for example, `{{{case.title}}}`), the JSON is not validated in this step. The JSON is validated after the Mustache variables have been placed when REST method runs. Manually ensure that the JSON is valid, disregarding the Mustache variables, so the later validation will pass.
    ::::

Create case response external key
:   The JSON key in the create external case response that contains the case ID.

Create case URL
:   The REST API URL to create a case in the third-party system. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts.

Create comment method
:   The optional REST API HTTP request method to create a case comment in the third-party system: `post`, `put`(default), or `patch`.

Create comment object
:   An optional JSON payload sent to the create comment URL to create a case comment. Use the variable selector to add {{kib}} cases data to the payload. The required variable is `case.comment`. For example:

    ```json
    {
      "body": {{{case.comment}}}
    }
    ```

    ::::{note}
    Due to Mustache template variables (the text enclosed in triple braces, for example, `{{{case.title}}}`), the JSON is not validated in this step. The JSON is validated once the mustache variables have been placed and when REST method runs. We recommend manually ensuring that the JSON is valid, disregarding the Mustache variables, so the later validation will pass.
    ::::

Create comment URL
:   The optional REST API URL to create a case comment by ID in the third-party system. Use the variable selector to add the external system ID to the URL. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts. For example:

    ```text
    https://testing-jira.atlassian.net/rest/api/2/issue/{{{external.system.id}}}/comment
    ```

External case view URL
:   The URL to view the case in the external system. Use the variable selector to add the external system ID or external system title to the URL. For example:

    ```text
    https://testing-jira.atlassian.net/browse/{{{external.system.title}}}
    ```

Get case response external title key
:   The JSON key in the get external case response that contains the case title.

Get case URL
:   The REST API URL to GET case by ID from the third-party system. Use the variable selector to add the external system ID to the URL. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts. For example:

    ```text
    https://testing-jira.atlassian.net/rest/api/2/issue/{{{external.system.id}}}
    ```

    ::::{note}
    Due to Mustache template variables (the text enclosed in triple braces, for example, `{{{case.title}}}`), the JSON is not validated in this step. The JSON is validated after the Mustache variables have been placed when REST method runs. Manually ensure that the JSON is valid, disregarding the Mustache variables, so the later validation will pass.
    ::::

HTTP headers
:   A set of key-value pairs sent as headers with the request URLs for the create case, update case, get case, and create comment methods. For example, set `Content-Type` to the appropriate media type for your requests.

Update case method
:   The REST API HTTP request method to update the case in the third-party system: `post`, `put`(default), or `patch`.

Update case object
:   A JSON payload sent to the update case URL to update the case. Use the variable selector to add {{kib}} cases data to the payload. Required variables are `case.title` and `case.description`. For example:

    ```json
    {
    	"fields": {
    	  "summary": {{{case.title}}},
    	  "description": {{{case.description}}},
    	  "labels": {{{case.tags}}}
    	}
    }
    ```

    ::::{note}
    Due to Mustache template variables (which is the text enclosed in triple braces, for example, `{{{case.title}}}`), the JSON is not validated in this step. The JSON is validated after the Mustache variables have been placed when REST method runs. Manually ensure that the JSON is valid to avoid future validation errors; disregard Mustache variables during your review.
    ::::

Update case URL
:   The REST API URL to update the case by ID in the third-party system. Use the variable selector to add the external system ID to the URL. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts. For example:

    ```text
    https://testing-jira.atlassian.net/rest/api/2/issue/{{{external.system.ID}}}
    ```

## Test connectors [cases-webhook-action-configuration]

You can test connectors as you’re creating or editing the connector in {{kib}}. For example:

:::{image} ../images/cases-webhook-test.png
:alt: {{webhook-cm}} params test
:screenshot:
:::

{{webhook-cm}} actions have the following configuration properties:

Additional comments
:   Additional information for the client, such as how to troubleshoot the issue.

Case ID
:   A unique case identifier.

Description
:   The details about the incident.

Labels
:   The labels for the incident.

Severity
:   The severity of the case can be `critical`, `high`, `low`, or `medium`.

Status
:   The status of the case can be `closed`, `in-progress` or `open`.

Summary
:   A brief case summary.

Tags
:   A list of tags that can be used to filter cases.

## Connector networking configuration [cases-webhook-connector-networking-configuration]

Use the [action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.
