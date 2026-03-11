---
navigation_title: "{{sn-itom}}"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/servicenow-itom-action-type.html
applies_to:
  stack: all
  serverless:
    observability: ga
    security: ga
---

# {{sn-itom}} connector and action [servicenow-itom-action-type]

The {{sn-itom}} connector uses the [event API](https://docs.servicenow.com/bundle/rome-it-operations-management/page/product/event-management/task/send-events-via-web-service.md) to create {{sn}} events. You can use the connector for rule actions.

## Create connectors in {{kib}} [define-servicenow-itom-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you’re creating a rule. You must choose whether to use OAuth for authentication.

:::{image} ../images/servicenow-itom-connector-basic.png
:alt: {{sn-itom}} connector using basic auth
:screenshot:
:::

:::{image} ../images/servicenow-itom-connector-oauth.png
:alt: {{sn-itom}} connector using OAuth
:screenshot:
:::

### Connector configuration [servicenow-itom-connector-configuration]

{{sn-itom}} connectors have the following configuration properties:

Client ID
:   The client identifier assigned to your OAuth application.

Client secret
:   The client secret assigned to your OAuth application.

JWT verifier key ID
:   The key identifier assigned to the JWT verifier map of your OAuth application.

Password
:   The password for HTTP basic authentication.

Private key
:   The RSA private key that you created for use in ServiceNow.

Private key password
:   The password for the RSA private key. This value is required when you set a password for your private key.

{{sn}} instance URL
:   The full URL for the {{sn}} instance.

Use OAuth authentication
:   By default, basic authentication is used instead of open authorization (OAuth).

User identifier
:   The identifier to use for OAuth type authentication. This identifier should be the user field you selected when you created an OAuth JWT API endpoint for external clients in your ServiceNow instance. For example, if the selected user field is `Email`, the user identifier should be the user’s email address.

Username
:   The username for HTTP basic authentication.

## Test connectors [servicenow-itom-action-configuration]

You can test connectors as you’re creating or editing the connector in {{kib}}. For example:

:::{image} ../images/servicenow-itom-params-test.png
:alt: {{sn-itom}} params test
:screenshot:
:::

{{sn-itom}} actions have the following configuration properties.

Description
:   The details about the event.

Message key
:   All actions sharing this key are associated with the same {{sn}} alert. The default value is `{{rule.id}}:{{alert.id}}`.

Metric name
:   The name of the metric.

Node
:   The host that the event was triggered for.

Resource
:   The name of the resource.

Severity
:   The severity of the event.

Source
:   The name of the event source type.

Source instance
:   A specific instance of the source.

Type
:   The type of event.

Refer to [{{sn}} documentation](https://docs.servicenow.com/bundle/rome-it-operations-management/page/product/event-management/task/send-events-via-web-service.md) for more information about the properties.

## Connector networking configuration [servicenow-itom-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Configure {{sn-itom}} [configuring-servicenow-itom]

{{sn}} offers free [Personal Developer Instances](https://developer.servicenow.com/dev.do#!/guides/madrid/now-platform/pdi-guide/obtaining-a-pdi), which you can use to test incidents.

### Prerequisites [servicenow-itom-connector-prerequisites]

1. [Create a {{sn}} integration user and assign it the appropriate roles.](#servicenow-itom-connector-prerequisites-integration-user)
2. If you use open authorization (OAuth), you must also:

    1. [Create an RSA keypair and add an X.509 Certificate](#servicenow-itom-connector-prerequisites-rsa-key).
    2. [Create an OAuth JWT API endpoint for external clients with a JWT Verifiers Map](#servicenow-itom-connector-prerequisites-endpoint).

### Create a {{sn}} integration user [servicenow-itom-connector-prerequisites-integration-user]

To ensure authenticated communication between Elastic and {{sn}}, create a {{sn}} integration user and assign it the appropriate roles.

1. In your {{sn}} instance, go to **System Security → Users and Groups → Users**.
2. Click **New**.
3. Complete the form, then right-click on the menu bar and click **Save**.
4. Go to the **Roles** tab and click **Edit**.
5. Assign the integration user the following roles:

    * `personalize_choices`: Allows the user to retrieve Choice element options, such as Severity.
    * `evt_mgmt_integration`: Enables integration with external event sources by allowing the user to create events.

6. Click **Save**.

### Create an RSA keypair and add an X.509 Certificate [servicenow-itom-connector-prerequisites-rsa-key]

This step is required to use OAuth for authentication between Elastic and {{sn}}.

#### Create an RSA keypair

1. Use [OpenSSL](https://www.openssl.org/docs/man1.0.2/man1/genrsa.md) to generate an RSA private key.

    * To create a private key with a password, use the `passout` option. For example:

        ```sh
        openssl genrsa -passout pass:foobar -out example-private-key-with-password.pem 3072
        ```

    * To create a private key without a password, omit the `passout` option. For example:

        ```sh
        openssl genrsa -out example-private-key.pem 3072
        ```

2. Use [OpenSSL](https://www.openssl.org/docs/man1.0.2/man1/req.md) to generate the matching public key:

    ```sh
    openssl req -new -x509 -key example-private-key.pem -out example-sn-cert.pem -days 360
    ```

#### Add an X.509 certificate to ServiceNow

1. In your {{sn}} instance, go to **Certificates** and select **New**.
2. Configure the certificate as follows:

    * **Name**: Name the certificate.
    * **PEM Certificate**: Copy the generated public key into this text field.

    :::{image} ../images/servicenow-new-certificate.png
    :alt: Shows new certificate form in ServiceNow
    :screenshot:
    :::

3. Click **Submit** to create the certificate.

### Create an OAuth JWT API endpoint for external clients with a JWT Verifiers Map [servicenow-itom-connector-prerequisites-endpoint]

This step is required to use OAuth for authentication between Elastic and {{sn}}.

1. In your {{sn}} instance, go to **Application Registry** and select **New**.
2. Select **Create an OAuth JWT API endpoint for external clients** from the list of options.

    :::{image} ../images/servicenow-jwt-endpoint.png
    :alt: Shows application type selection
    :screenshot:
    :::

3. Configure the application as follows:

    * **Name**: Name the application.
    * **User field**: Select the field to use as the user identifier.

    :::{image} ../images/servicenow-new-application.png
    :alt: Shows new application form in ServiceNow
    :screenshot:
    :::

    ::::{important}
    Remember the selected user field. You will use this as the **User Identifier Value** when creating the connector. For example, if you selected **Email** for **User field**, you will use the user’s email for the **User Identifier Value**.
    ::::

4. Click **Submit** to create the application. You will be redirected to the list of applications.
5. Select the application you just created.
6. Find the **Jwt Verifier Maps** tab and click **New**.
7. Configure the new record as follows:

    * **Name**: Name the JWT Verifier Map.
    * **Sys certificate**: Click the search icon and select the name of the certificate created in the previous step.

    :::{image} ../images/servicenow-new-jwt-verifier-map.png
    :alt: Shows new JWT Verifier Map form in ServiceNow
    :screenshot:
    :::

8. Click **Submit** to create the verifier map.
9. Note the **Client ID**, **Client Secret** and **JWT Key ID**. You will need these values to create your {{sn}} connector.

:::{image} ../images/servicenow-oauth-values.png
:alt: Shows where to find OAuth values in ServiceNow
:screenshot:
:::

