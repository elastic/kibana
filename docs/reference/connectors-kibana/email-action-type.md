---
navigation_title: "Email"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/email-action-type.html
applies_to:
  stack: all
  serverless: all
---

# Email connector and action [email-action-type]

The email connector uses the SMTP protocol to send mail messages. Email message text is sent as both plain text and html text.

::::{note}
* For emails to have a footer with a link back to {{kib}}, set the [`server.publicBaseUrl`](/reference/configuration-reference/general-settings.md#server-publicBaseUrl) configuration setting.
* When the [`xpack.actions.email.domain_allowlist`](/reference/configuration-reference/alerting-settings.md#action-config-email-domain-allowlist) configuration setting is used, the email addresses used for all of the Sender (from), To, CC, and BCC properties must have email domains specified in the configuration setting.
::::

## Create connectors in {{kib}} [define-email-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you’re creating a rule. For example:

:::{image} ../images/email-connector.png
:alt: Email connector
:screenshot:
:::

### Connector configuration [email-connector-configuration]

Email connectors have the following configuration properties:

Name
:   The name of the connector. The name is used to identify a  connector in the management UI connector listing, or in the connector list when configuring an action.

Sender
:   The from address for all emails sent with this connector. This must be specified in `user@host-name` format. See the [Nodemailer address documentation](https://nodemailer.com/message/addresses/) for more information.

Service
:   The name of the email service. If `service` is one of Nodemailer’s well-known email service providers, the `host`, `port`, and `secure` properties are defined with the default values and disabled for modification. If `service` is `MS Exchange Server`, the `host`, `port`, and `secure` properties are ignored and `tenantId`, `clientId`, `clientSecret` are required instead. If `service` is `other`, the `host` and `port` properties must be defined.

Host
:   Host name of the service provider. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure this hostname is added to the allowed hosts.

Port
:   The port to connect to on the service provider.

Secure
:   If true, the connection will use TLS when connecting to the service provider. Refer to the [Nodemailer TLS documentation](https://nodemailer.com/smtp/#tls-options) for more information. If not true, the connection will initially connect over TCP, then attempt to switch to TLS via the SMTP STARTTLS command.

Tenant ID
:   The directory tenant that the application plans to operate against, in GUID format.

Client ID
:   The application ID that is assigned to your app, in GUID format. You can find this information in the portal where you registered your app.

Client Secret
:   The client secret that you generated for your app in the app registration portal. The client secret must be URL-encoded before being sent. The Basic auth pattern of providing credentials in the Authorization header, per [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1), is also supported.

Require authentication
:   If true, a username and password for login type authentication must be provided.

Username
:   Username for login type authentication.

Password
:   Password for login type authentication.


## Test connectors [email-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. For example:

:::{image} ../images/email-params-test.png
:alt: Email params test
:screenshot:
:::

Email actions have the following configuration properties.

To, CC, BCC
:   Each item is a list of addresses. Addresses can be specified in `user@host-name` format, or in `name <user@host-name>` format. One of To, CC, or BCC must contain an entry.

Subject
:   The subject line of the email.

Message
:   The message text of the email. Markdown format is supported.

## Connector networking configuration [email-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Configure email accounts for well-known services [configuring-email]

The email connector uses an integration of [Nodemailer](https://nodemailer.com/) to send email from many popular SMTP email services. For Microsoft Exchange email, it uses the Microsoft Graph API.

For other email servers, you can check the list of well-known services that Nodemailer supports in the JSON file [well-known/services.json](https://github.com/nodemailer/nodemailer/blob/master/lib/well-known/services.json). The properties of the objects in those files — `host`, `port`, and `secure` — correspond to the same email connector configuration properties. A missing `secure` property in the "well-known/services.json" file is considered `false`.  Typically, `port: 465` uses `secure: true`, and `port: 25` and `port: 587` use `secure: false`.

### {{ecloud}} [elasticcloud]

Use the preconfigured email connector (`Elastic-Cloud-SMTP`) to send emails from {{ecloud}}.

::::{note}
For more information on the preconfigured email connector, see [{{ecloud}} email service limits](docs-content://deploy-manage/deploy/elastic-cloud/tools-apis.md#email-service-limits).
::::

### Gmail [gmail]

To create a connector that sends email from the [Gmail](https://mail.google.com) SMTP service, set the **Service** to `Gmail`.

If you get an authentication error that indicates that you need to continue the sign-in process from a web browser when the action attempts to send email, you need to configure Gmail to [allow less secure apps to access your account](https://support.google.com/accounts/answer/6010255?hl=en).

If two-step verification is enabled for your account, you must generate and use a unique App Password to send email from {{kib}}. See [Sign in using App Passwords](https://support.google.com/accounts/answer/185833?hl=en) for more information.

### Outlook.com [outlook]

To create a connector that sends email from the [Outlook.com](https://www.outlook.com/) SMTP service, set the **Service** to `Outlook`.

When sending emails, you must provide a `from` address, either as the default in your connector configuration or as part of the email action in the rule.

::::{note}
You must use a unique App Password if two-step verification is enabled. See [App passwords and two-step verification](http://windows.microsoft.com/en-us/windows/app-passwords-two-step-verification) for more information.
::::

### Amazon SES [amazon-ses]

To create a connector that sends email from the [Amazon Simple Email Service](http://aws.amazon.com/ses) (SES) SMTP service, set the **Service** to `Amazon SES`.

::::{note}
You must use your Amazon SES SMTP credentials to send email through Amazon SES. For more information, see [Obtaining Your Amazon SES SMTP Credentials](http://docs.aws.amazon.com/ses/latest/DeveloperGuide/smtp-credentials.md). You might also need to verify [your email address](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/verify-email-addresses.md) or [your whole domain](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/verify-domains.md) at AWS.
::::

### Microsoft Exchange with basic authentication [exchange-basic-auth]

To prepare for the removal of Basic Auth, you must update all existing Microsoft Exchange connectors with the new configuration based on the [OAuth 2.0 Client Credentials Authentication](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow).

### Microsoft Exchange with OAuth 2.0 [exchange]

::::{note}
The email connector uses Microsoft Graph REST API v1.0, in particular the [sendMail](https://docs.microsoft.com/en-us/graph/api/user-sendmail) endpoint. It supports only the [Microsoft Graph global service](https://learn.microsoft.com/en-us/graph/deployments#microsoft-graph-and-graph-explorer-service-root-endpoints) root endpoint (`https://graph.microsoft.com`).
::::

Before you create an email connector for Microsoft Exchange, you must create and register the client integration application on the [Azure portal](https://go.microsoft.com/fwlink/?linkid=2083908):

:::{image} ../images/exchange-register-app.png
:alt: Register client application for MS Exchange
:screenshot:
:::

Next, open **Manage > API permissions**, and then define the permissions for the registered application to send emails. Refer to the [documentation](https://docs.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0&tabs=http#permissions) for the Microsoft Graph API.

:::{image} ../images/exchange-api-permissions.png
:alt: MS Exchange API permissions
:screenshot:
:::

Add the "Mail.Send" permission for Microsoft Graph. The permission appears in the list with the status "Not granted for `<your Azure active directory>`":

:::{image} ../images/exchange-not-granted.png
:alt: MS Exchange "Mail.Send" not granted
:screenshot:
:::

Click **Grant admin consent for `<your Azure active directory>`**.

:::{image} ../images/exchange-grant-confirm.png
:alt: MS Exchange grant confirmation
:screenshot:
:::

Confirm that the status for the "Mail.Send" permission is now granted.

:::{image} ../images/exchange-granted.png
:alt: MS Exchange grant confirmation
:screenshot:
:::

#### Configure the Microsoft Exchange Client secret [exchange-client-secret]

To configure the Microsoft Exchange Client secret, open **Manage > Certificates & secrets**:

:::{image} ../images/exchange-secrets.png
:alt: MS Exchange secrets configuration
:screenshot:
:::

Add a new client secret, then copy the value and put it to the proper field in the Microsoft Exchange email connector.

#### Configure the Microsoft Exchange client and tenant identifiers [exchange-client-tenant-id]

To find the Microsoft Exchange client and tenant IDs, open the **Overview** page:

:::{image} ../images/exchange-client-tenant.png
:alt: MS Exchange Client ID and Tenant ID configuration
:screenshot:
:::

Create a connector and set the **Service** to `MS Exchange Server`. Copy and paste the values into the proper fields.
