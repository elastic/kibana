---
navigation_title: "{{sn-itsm}}"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/servicenow-action-type.html
applies_to:
  stack: all
  serverless: all
---

# {{sn-itsm}} connector and action [servicenow-action-type]

The {{sn-itsm}} connector uses the [import set API](https://developer.servicenow.com/dev.do#!/reference/api/sandiego/rest/c_ImportSetAPI) to create {{sn}} incidents. You can use the connector for rule actions and cases.

## Create connectors in {{kib}} [define-servicenow-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you’re creating a rule. You must choose whether to use OAuth for authentication.

:::{image} ../images/servicenow-connector-basic.png
:alt: ServiceNow connector using basic auth
:screenshot:
:::

:::{image} ../images/servicenow-connector-oauth.png
:alt: ServiceNow connector using OAuth
:screenshot:
:::

### Connector configuration [servicenow-connector-configuration]

{{sn-itsm}} connectors have the following configuration properties:

Client ID
:   The client identifier assigned to your OAuth application.

Client secret
:   The client secret assigned to your OAuth application.

JWT verifier key ID
:   The key identifier assigned to the JWT verifier map of your OAuth application.

Password
:   The password for HTTP basic authentication.

Private key
:   The RSA private key that you created for use in {{sn}}.

Private key password
:   The password for the RSA private key. This values is required if you set a password for your private key.

{{sn}} instance URL
:   The full URL for the {{sn}} instance.

Use OAuth authentication
:   By default, basic authentication is used instead of open authorization (OAuth).

User identifier
:   The identifier to use for OAuth type authentication. This identifier should be the user field you selected during setup. For example, if the selected user field is `Email`, the user identifier should be the user’s email address.

Username
:   The username for HTTP basic authentication.

## Test connectors [servicenow-action-configuration]

When you create or edit a connector, use the **Test** tab to test its actions:

:::{image} ../images/servicenow-params-test.png
:alt: ServiceNow params test
:screenshot:
:::

{{sn-itsm}} actions have the following configuration properties.

Additional comments
:   Additional information for the client, such as how to troubleshoot the issue.

Additional fields
:   An object that contains custom field identifiers and their values.

    These fields must exist in the Elastic ServiceNow application and must be specified in JSON format. For example:

    ```sh
    {
        "u_cmdb_ci": "host-a",
        "u_company": "My company",
        "u_assignment_group": "Testing"
    }
    ```

    Note that the default source field names in the Elastic ServiceNow application are prefixed with "u_".

Category
:   The category of the incident.

Correlation display
:   A descriptive label of the alert for correlation purposes in {{sn}}.

Correlation ID
:   Connectors using the same correlation ID will be associated with the same {{sn}} incident. This value determines whether a new {{sn}} incident will be created or an existing one is updated. Modifying this value is optional; if not modified, the rule ID and alert ID are combined as `{{ruleID}}:{{alert ID}}` to form the correlation ID value in {{sn}}. The maximum character length for this value is 100 characters.

    ::::{note}
    Using the default configuration of `{{ruleID}}:{{alert ID}}` ensures that {{sn}} will create a separate incident record for every generated alert that uses a unique alert ID. If the rule generates multiple alerts that use the same alert IDs, {{sn}} creates and continually updates a single incident record for the alert.
    ::::

Description
:   The details about the incident.

Event action
:   The type of action to test: resolve or trigger. When you test a resolve action, you must provide a correlation identifier.

Impact
:   The effect an incident has on business. It can be measured by the number of affected users or by how critical it is to the business in question.

Severity
:   The severity of the incident.

Short description
:   A short description for the incident, used for searching the contents of the knowledge base.

Subcategory
:   The subcategory of the incident.

Urgency
:   The extent to which the incident resolution can delay.

::::{note}
When you create a rule that uses a {{sn-itsm}} connector, its recovery actions close {{sn}} incidents based on the correlation ID. If there are multiple incidents that match the correlation ID, the latest open incident for that ID is closed.
::::

## Connector networking configuration [servicenow-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Configure {{sn}} [configuring-servicenow]

{{sn}} offers free [Personal Developer Instances](https://developer.servicenow.com/dev.do#!/guides/madrid/now-platform/pdi-guide/obtaining-a-pdi), which you can use to test incidents.

### Prerequisites [servicenow-itsm-connector-prerequisites]

After upgrading from {{stack}} version 7.15.0 or earlier to version 7.16.0 or later, you must complete the following steps within your {{sn}} instance before creating a new {{sn-itsm}} connector or [updating an existing one](#servicenow-itsm-connector-update):

1. Install [Elastic for ITSM](https://store.servicenow.com/sn_appstore_store.do#!/store/application/7148dbc91bf1f450ced060a7234bcb88) from the {{sn}} store.
2. [Assign cross-scope privileges for the Elastic for ITSM app](#servicenow-itsm-connector-privileges).
3. [Create a {{sn}} integration user and assign it the appropriate roles](#servicenow-itsm-connector-prerequisites-integration-user).
4. [Create a Cross-Origin Resource Sharing (CORS) rule](#servicenow-itsm-connector-prerequisites-cors-rule).
5. If you use open authorization (OAuth), you must also:

    1. [Create an RSA keypair and add an X.509 Certificate](#servicenow-itsm-connector-prerequisites-rsa-key).
    2. [Create an OAuth JWT API endpoint for external clients with a JWT Verifiers Map](#servicenow-itsm-connector-prerequisites-endpoint).

### Assign cross-scope privileges [servicenow-itsm-connector-privileges]

The Elastic for ITSM app requires specific cross-scope privilege records to run successfully. In particular, you must have a privilege record for the `Elastic for ITSM` application with the status set to `Allowed` for each of the following targets:

| Target scope | Name | Type | Operation |
| --- | --- | --- | --- |
| Global | GlideRecord.insert | Scriptable | Execute API |
| Global | GlideRecord.setValue | Scriptable | Execute API |
| Global | GlideRecordSecure.getValue | Scriptable | Execute API |
| Global | Incident | Table | Read |
| Global | ScriptableServiceResultBuilder.setBody | Scriptable | Execute API |
| Global | ScopedGlideElement | Scriptable | Execute API |

To access the cross scope privileges table:

1. Log into {{sn}} and set your application scope to Elastic for ITSM.
2. Click **All** and search for `sys_scope_privilege`.

For more details, refer to the [{{sn}} product documentation](https://docs.servicenow.com/).

### Create a {{sn}} integration user [servicenow-itsm-connector-prerequisites-integration-user]

To ensure authenticated communication between Elastic and {{sn}}, create a {{sn}} integration user and assign it the appropriate roles.

1. In your {{sn}} instance, go to **System Security → Users and Groups → Users**.
2. Click **New**.
3. Complete the form, then right-click on the menu bar and click **Save**.
4. Go to the **Roles** tab and click **Edit**.
5. Assign the integration user the following roles: 

    * `import_set_loader`
    * `import_transformer`
    * `personalize_choices`
    * `x_elas2_inc_int.integration_user`

6. Click **Save**.

### Create a CORS rule [servicenow-itsm-connector-prerequisites-cors-rule]

A CORS rule is required for communication between Elastic and {{sn}}. To create a CORS rule:

1. In your {{sn}} instance, go to **System Web Services → REST → CORS Rules**.
2. Click **New**.
3. Configure the rule as follows:

    * **Name**: Name the rule.
    * **REST API**: Set the rule to use the Elastic ITSM API by choosing `Elastic ITSM API [x_elas2_inc_int/elastic_api]`.
    * **Domain**: Enter the Kibana URL, including the port number.

4. Go to the **HTTP methods** tab and select **GET**.
5. Click **Submit** to create the rule.

### Create an RSA keypair and add an X.509 certificate [servicenow-itsm-connector-prerequisites-rsa-key]

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

### Create an OAuth JWT API endpoint for external clients with a JWT Verifiers Map [servicenow-itsm-connector-prerequisites-endpoint]

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

## Update a deprecated {{sn-itsm}} connector [servicenow-itsm-connector-update]

{{sn-itsm}} connectors created in {{stack}} version 7.15.0 or earlier are marked as deprecated after you upgrade to version 7.16.0 or later. Deprecated connectors have a yellow icon after their name and display a warning message when selected.

:::{image} ../images/servicenow-sir-update-connector.png
:alt: Shows deprecated ServiceNow connectors
:screenshot:
:::

::::{important}
Deprecated connectors will continue to function with the rules they were added to and can be assigned to new rules. However, it is strongly recommended to update deprecated connectors or [create new ones](/reference/connectors-kibana.md#creating-new-connector) to ensure you have access to connector enhancements, such as updating incidents.
::::

To update a deprecated connector:

1. Go to the **{{connectors-ui}}** page using the navigation menu or the [global search field](docs-content://get-started/the-stack.md#kibana-navigation-search).
2. Select the deprecated connector to open the **Edit connector** flyout.
3. In the warning message, click **Update this connector**.
4. Complete the guided steps in the **Edit connector** flyout.

    1. Install [Elastic for ITSM](https://store.servicenow.com/sn_appstore_store.do#!/store/application/7148dbc91bf1f450ced060a7234bcb88) and complete the [required prerequisites](#servicenow-itsm-connector-prerequisites).
    2. Enter the URL of your {{sn}} instance.
    3. Enter the username and password of your {{sn}} instance.

5. Click **Update**.
