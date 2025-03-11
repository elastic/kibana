---
navigation_title: "Alerting and action settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/alert-action-settings-kb.html
---

# Alerting and action settings in {{kib}} [alert-action-settings-kb]


Alerting and actions are enabled by default in {{kib}}, but require you to configure the following:

1. [Set up {{kib}} to work with {{stack}} {{security-features}}](docs-content://deploy-manage/security/secure-your-cluster-deployment.md).
2. [Set up TLS encryption between {{kib}} and {{es}}](docs-content://deploy-manage/security/set-up-basic-security-plus-https.md#encrypt-kibana-http).
3. If you are using an **on-premises** Elastic Stack deployment, [specify a value for `xpack.encryptedSavedObjects.encryptionKey`](#general-alert-action-settings).

You can configure the following settings in the `kibana.yml` file.


## General settings [general-alert-action-settings]

`xpack.encryptedSavedObjects.encryptionKey`
:   ::::{admonition}
A string of 32 or more characters used to encrypt sensitive properties on alerting rules and actions before they’re stored in Elasticsearch. Third party credentials — such as the username and password used to connect to an SMTP service — are an example of encrypted properties.

Kibana offers a [CLI tool](/reference/commands/kibana-encryption-keys.md) to help generate this encryption key.

If not set, Kibana will generate a random key on startup, but all alerting and action functions will be blocked. Generated keys are not allowed for alerting and actions because when a new key is generated on restart, existing encrypted data becomes inaccessible. For the same reason, alerting and actions in high-availability deployments of Kibana will behave unexpectedly if the key isn’t the same on all instances of Kibana.

Although the key can be specified in clear text in `kibana.yml`, it’s recommended to store this key securely in the [Kibana Keystore](docs-content://deploy-manage/security/secure-settings.md). Be sure to back up the encryption key value somewhere safe, as your alerting rules and actions will cease to function due to decryption failures should you lose it.  If you want to rotate the encryption key, be sure to follow the instructions on [encryption key rotation](docs-content://deploy-manage/security/secure-saved-objects.md#encryption-key-rotation).

Data type: `string`<br>

::::




## Action settings [action-settings]

`xpack.actions.allowedHosts` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
A list of hostnames that Kibana is allowed to connect to when built-in actions are triggered. It defaults to `["*"]`, allowing any host, but keep in mind the potential for SSRF attacks when hosts are not explicitly added to the allowed hosts. An empty list `[]` can be used to block built-in actions from making any external connections.

Note that hosts associated with built-in actions, such as Slack and PagerDuty, are not automatically added to allowed hosts. If you are not using the default `["*"]` setting, you must ensure that the corresponding endpoints are added to the allowed hosts as well.

Data type: `string`<br>

::::



`xpack.actions.customHostSettings` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
A list of custom host settings to override existing global settings.

Each entry in the list must have a `url` property, to associate a connection type (mail or https), hostname and port with the remaining options in the entry.

The settings in `xpack.actions.customHostSettings` can be used to override the global option `xpack.actions.ssl.verificationMode` and provide customized TLS settings on a per-server basis. Set `xpack.actions.ssl.verificationMode` to the value to be used by default for all servers, then add an entry in `xpack.actions.customHostSettings` for every server that requires customized settings.

Data type: `string`<br> Default: `an empty list`<br>

In the following example, two custom host settings are defined.  The first provides a custom host setting for mail server `mail.example.com` using port 465 that supplies server certificate authentication data from both a file and inline, and requires TLS for the connection.  The second provides a custom host setting for https server `webhook.example.com` which turns off server certificate authentication, that will allow Kibana to connect to the server if it’s using a self-signed certificate.  The individual properties that can be used in the settings are documented below.

```yaml
xpack.actions.customHostSettings:
  - url: smtp://mail.example.com:465
    ssl:
      verificationMode: 'full'
      certificateAuthoritiesFiles: [ 'one.crt' ]
      certificateAuthoritiesData: |
          -----BEGIN CERTIFICATE-----
          MIIDTD...
          CwUAMD...
          ... multiple lines of certificate data ...
          -----END CERTIFICATE-----
    smtp:
      requireTLS: true
  - url: https://webhook.example.com
    ssl:
      verificationMode: 'none'
```

::::



`xpack.actions.customHostSettings[n].url` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
A URL associated with this custom host setting.  Should be in the form of `protocol://hostname:port`, where `protocol` is `https` or `smtp`.  If the port is not provided, 443 is used for `https` and 25 is used for `smtp`.  The `smtp` URLs are used for the Email actions that use this server, and the `https` URLs are used for actions which use `https` to connect to services.

Entries with `https` URLs can use the `ssl` options, and entries with `smtp` URLs can use both the `ssl` and `smtp` options.

No other URL values should be part of this URL, including paths, query strings, and authentication information.  When an http or smtp request is made as part of running an action, only the protocol, hostname, and port of the URL for that request are used to look up these configuration values.

Data type: `string`<br>

::::



`xpack.actions.customHostSettings[n].smtp.ignoreTLS` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
A boolean value indicating that TLS must not be used for this connection. The options `smtp.ignoreTLS` and `smtp.requireTLS` can not both be set to true.

Data type: `bool`<br> Default: `false`<br>

::::



`xpack.actions.customHostSettings[n].smtp.requireTLS` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
A boolean value indicating that TLS must be used for this connection. The options `smtp.ignoreTLS` and `smtp.requireTLS` can not both be set to true.

Data type: `bool`<br> Default: `false`<br>

::::



$$$action-config-custom-host-verification-mode$$$

`xpack.actions.customHostSettings[n].ssl.verificationMode` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Controls the verification of the server certificate that Kibana receives when making an outbound SSL/TLS connection to the host server. Valid values are `full`, `certificate`, and `none`. Use `full` to perform hostname verification, `certificate` to skip hostname verification, and `none` to skip verification. Default: `full`. [Equivalent Kibana setting](/reference/configuration-reference/general-settings.md#elasticsearch-ssl-verificationMode). Overrides the general `xpack.actions.ssl.verificationMode` configuration for requests made for this hostname/port.

Data type: `enum`<br>

Options:

* `full`
* `certificate`
* `none`

Default: `full`<br>

::::



`xpack.actions.customHostSettings[n].ssl.certificateAuthoritiesFiles`
:   ::::{admonition}
A file name or list of file names of PEM-encoded certificate files to use to validate the server.

Data type: `string`<br>

::::



`xpack.actions.customHostSettings[n].ssl.certificateAuthoritiesData` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
The contents of one or more PEM-encoded certificate files in multiline format. This configuration can be used for environments where the files cannot be made available.

Data type: `string`<br>

::::



$$$action-config-email-domain-allowlist$$$

`xpack.actions.email.domain_allowlist` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   :::::{admonition}
A list of allowed email domains which can be used with the email connector. When this setting is not used, all email domains are allowed. When this setting is used, if any email is attempted to be sent that (a) includes an addressee with an email domain that is not in the allowlist, or (b) includes a from address domain that is not in the allowlist, it will fail with a message indicating the email is not allowed.

::::{warning}
This feature is available in Kibana 7.17.4 and 8.3.0 onwards but is not supported in Kibana 8.0, 8.1 or 8.2. As such, this setting should be removed before upgrading from 7.17 to 8.0, 8.1 or 8.2. It is possible to configure the settings in 7.17.4 and then upgrade to 8.3.0 directly. Data type: `string`<br>
::::


:::::



`xpack.actions.enableFooterInEmail` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
A boolean value indicating that a footer with a relevant link should be added to emails sent as alerting actions.

Data type: `bool`<br> Default: `true`<br>

::::



`xpack.actions.enabledActionTypes` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   :::::{admonition}
A list of action types that are enabled. It defaults to `["*"]`, enabling all types. The names for built-in Kibana action types are prefixed with a `.` and include: `.email`, `.index`, `.jira`, `.opsgenie`, `.pagerduty`, `.resilient`, `.server-log`, `.servicenow`, .`servicenow-itom`, `.servicenow-sir`, `.slack`, `.swimlane`, `.teams`, `.tines`, `.torq`, `.xmatters`,  `.gen-ai`,  `.bedrock`, `.gemini`,  `.d3security`, and `.webhook`. An empty list `[]` will disable all action types.

Disabled action types will not appear as an option when creating new connectors, but existing connectors and actions of that type will remain in Kibana and will not function.

::::{important}
[Preconfigured connectors](/reference/connectors-kibana/pre-configured-connectors.md) are not affected by this setting. Data type: `string`<br> Default: `["*"]`<br>
::::


:::::



`xpack.actions.microsoftExchangeUrl`
:   ::::{admonition}
The URL for the Microsoft Azure Active Directory endpoint to use for MS Exchange email authentication.

Data type: `string`<br> Default: `https://login.microsoftonline.com`<br>

::::



`xpack.actions.microsoftGraphApiUrl`
:   ::::{admonition}
The URL for the Microsoft Graph API endpoint to use for MS Exchange email authentication.

Data type: `string`<br> Default: `https://graph.microsoft.com/v1.0`<br>

::::



`xpack.actions.microsoftGraphApiScope`
:   ::::{admonition}
The URL for the Microsoft Graph API scope endpoint to use for MS Exchange email authentication.

Data type: `string`<br> Default: `https://graph.microsoft.com/.default`<br>

::::



`xpack.actions.proxyUrl` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies the proxy URL to use, if using a proxy for actions. By default, no proxy is used.

Proxies may be used to proxy http or https requests through a proxy using the http or https protocol.  Kibana only uses proxies in "CONNECT" mode (sometimes referred to as "tunneling" TCP mode, compared to HTTP mode).  That is, Kibana will always make requests through a proxy using the HTTP `CONNECT` method.

If your proxy is using the https protocol (vs the http protocol), the setting `xpack.actions.ssl.proxyVerificationMode: none` will likely be needed, unless your proxy’s certificates are signed using a publicly available certificate authority.

There is currently no support for using basic authentication with a proxy (authentication for the proxy itself, not the URL being requested through the proxy).

Data type: `string`<br>

To help diagnose problems using a proxy, you can use the `curl` command with options to use your proxy, and log debug information, with the following command, replacing the proxy and target URLs as appropriate.  This will force the request to be made to the proxy in tunneling mode, and display some of the interaction between the client and the proxy.

```sh
curl --verbose --proxytunnel --proxy http://localhost:8080 http://example.com
```

::::



`xpack.actions.proxyBypassHosts` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies hostnames which should not use the proxy, if using a proxy for actions. The value is an array of hostnames as strings.

By default, all hosts will use the proxy, but if an action’s hostname is in this list, the proxy will not be used.  The settings `xpack.actions.proxyBypassHosts` and `xpack.actions.proxyOnlyHosts` cannot be used at the same time.

Data type: `string`<br>

For example:

```yaml
xpack.actions.proxyBypassHosts: [ "events.pagerduty.com" ]
```

If applicable, include the subdomain in the hostname

::::



`xpack.actions.proxyOnlyHosts` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies hostnames which should only use the proxy, if using a proxy for actions. The value is an array of hostnames as strings.

By default, no hosts will use the proxy, but if an action’s hostname is in this list, the proxy will be used.  The settings `xpack.actions.proxyBypassHosts` and `xpack.actions.proxyOnlyHosts` cannot be used at the same time.

Data type: `string`<br>

For example:

```yaml
xpack.actions.proxyOnlyHosts: [ "events.pagerduty.com" ]
```

If applicable, include the subdomain in the hostname

::::



`xpack.actions.proxyHeaders` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies HTTP headers for the proxy, if using a proxy for actions.

Data type: `string`<br> Default: `{}`<br>

::::



$$$action-config-proxy-verification-mode$$$

`xpack.actions.ssl.proxyVerificationMode` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Controls the verification for the proxy server certificate that Kibana receives when making an outbound SSL/TLS connection to the proxy server.

Use `full` to perform hostname verification, `certificate` to skip hostname verification, and `none` to skip verification.

[Equivalent Kibana setting](/reference/configuration-reference/general-settings.md#elasticsearch-ssl-verificationMode)

Data type: `enum`<br>

Options:

* `full`
* `certificate`
* `none`

Default: `full`<br>

::::



$$$action-config-verification-mode$$$

`xpack.actions.ssl.verificationMode` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Controls the verification for the server certificate that Elastic Maps Server receives when making an outbound SSL/TLS connection for actions. Valid values are `full`, `certificate`, and `none`. Use `full` to perform hostname verification, `certificate` to skip hostname verification, and `none` to skip verification.

[Equivalent Kibana setting](/reference/configuration-reference/general-settings.md#elasticsearch-ssl-verificationMode)

This setting can be overridden for specific URLs by using the setting `xpack.actions.customHostSettings[n].ssl.verificationMode` (described above) to a different value.

Data type: `enum`<br>

Options:

* `full`
* `certificate`
* `none`

Default: `full`<br>

::::



`xpack.actions.maxResponseContentLength` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies the max number of bytes of the http response for requests to external resources.

Data type: `int`<br> Default: `1000000 (1MB)`<br>

::::



`xpack.actions.responseTimeout` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies the time allowed for requests to external resources. Requests that take longer are canceled. The time is formatted as a number and a time unit (`ms`, `s`, `m`, `h`, `d`, `w`, `M`, or `Y`). For example, `20m`, `24h`, `7d`, `1w`. Default: `60s`.

Data type: `string`<br>

::::



`xpack.actions.run.maxAttempts` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies the maximum number of times an action can be attempted to run.

Data type: `int`<br>

Options:

* `minimum 1 and maximum 10`

::::



`xpack.actions.run.connectorTypeOverrides` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Overrides the configs under `xpack.actions.run` for the connector type with the given ID. List the connector type identifier and its settings in an array of objects.

Data type: `string`<br>

For example:

```yaml
xpack.actions.run:
    maxAttempts: 1
    connectorTypeOverrides:
        - id: '.server-log'
          maxAttempts: 5
```

::::



`xpack.actions.queued.max` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies the maximum number of actions that can be queued.

Data type: `int`<br> Default: `1000000`<br>

::::




## Preconfigured connector settings [preconfigured-connector-settings]

These settings vary depending on which type of preconfigured connector you’re adding.

For example:

```yaml
xpack.actions.preconfigured:
  my-server-log:
    name: preconfigured-server-log-connector-type
    actionTypeId: .server-log
```

For more examples, go to [Preconfigured connectors](/reference/connectors-kibana/pre-configured-connectors.md).

`xpack.actions.preconfiguredAlertHistoryEsIndex` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Enables a preconfigured alert history Elasticsearch [Index](/reference/connectors-kibana/index-action-type.md) connector.

Data type: `bool`<br> Default: `false`<br>

::::



`xpack.actions.preconfigured`
:   ::::{admonition}
Specifies configuration details that are specific to the type of preconfigured connector.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.actionTypeId`
:   ::::{admonition}
The type of preconfigured connector.

Options:

* `.email`
* `.index`
* `.opsgenie`
* `.server-log`
* `.resilient`
* `.slack`
* `.webhook`

::::



`xpack.actions.preconfigured.<connector-id>.config`
:   ::::{admonition}
The configuration details, which are specific to the type of preconfigured connector.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.apiProvider`
:   ::::{admonition}
For a [OpenAI connector](/reference/connectors-kibana/openai-action-type.md), specifies the OpenAI API provider.

Data type: `enum`<br>

Options:

* `OpenAI`
* `Azure OpenAI`

::::



`xpack.actions.preconfigured.<connector-id>.config.apiUrl`
:   :::::{admonition}
A configuration URL that varies by connector:

* For an [{{bedrock}} connector](/reference/connectors-kibana/bedrock-action-type.md), specifies the {{bedrock}} request URL.
* For an [{{gemini}} connector](/reference/connectors-kibana/gemini-action-type.md), specifies the {{gemini}} request URL.
* For a [OpenAI connector](/reference/connectors-kibana/openai-action-type.md), specifies the OpenAI request URL.
* For a [{{ibm-r}} connector](/reference/connectors-kibana/resilient-action-type.md), specifies the {{ibm-r}} instance URL.
* For a [Jira connector](/reference/connectors-kibana/jira-action-type.md), specifies the Jira instance URL.
* For an [{{opsgenie}} connector](/reference/connectors-kibana/opsgenie-action-type.md), specifies the {{opsgenie}} URL. For example, `https://api.opsgenie.com` or `https://api.eu.opsgenie.com`.
* For a [PagerDuty connector](/reference/connectors-kibana/pagerduty-action-type.md), specifies the PagerDuty event URL. Defaults to `https://events.pagerduty.com/v2/enqueue`.
* For a [{{sn-itsm}}](/reference/connectors-kibana/servicenow-action-type.md), [{{sn-sir}}](/reference/connectors-kibana/servicenow-sir-action-type.md), or [{{sn-itom}} connector](/reference/connectors-kibana/servicenow-itom-action-type.md) specifies the ServiceNow instance URL.
* For a [{{swimlane}} connector](/reference/connectors-kibana/swimlane-action-type.md), specifies the {{swimlane}} instance URL.

::::{note}
If you are using the `xpack.actions.allowedHosts` setting, make sure the hostname in the URL is added to the allowed hosts. Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.config.appId`
:   ::::{admonition}
An application ID that varies by connector:

* For a [{{swimlane}} connector](/reference/connectors-kibana/swimlane-action-type.md), specifies a {{swimlane}} application identifier.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.clientId`
:   ::::{admonition}
A client identifier that varies by connector:

* For an [email connector](/reference/connectors-kibana/email-action-type.md), specifies a GUID format value that corresponds to the client ID, which is a part of OAuth 2.0 client credentials authentication.
* For a [{{sn-itom}}](/reference/connectors-kibana/servicenow-itom-action-type.md), [{{sn-itsm}}](/reference/connectors-kibana/servicenow-action-type.md), or [{{sn-sir}} connector](/reference/connectors-kibana/servicenow-sir-action-type.md) specifies the client identifier assigned to the OAuth application.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.configUrl`
:   ::::{admonition}
For an [xMatters connector](/reference/connectors-kibana/xmatters-action-type.md) with basic authentication, specifies the request URL for the Elastic Alerts trigger in xMatters.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.createCommentJson`
:   :::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a stringified JSON payload with Mustache variables that is sent to the create comment URL to create a case comment. The required variable is `case.description`.

::::{note}
The JSON is validated after the Mustache variables have been placed when the REST method runs. You should manually ensure that the JSON is valid, disregarding the Mustache variables, so the later validation will pass. Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.config.createCommentMethod`
:   ::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies the REST API HTTP request method to create a case comment in the third-party system.

Data type: `string`<br>

Options:

* `post`
* `put`
* `patch`

Default: `put`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.createCommentUrl`
:   :::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a REST API URL string to create a case comment by ID in the third-party system.

::::{note}
If you are using the `xpack.actions.allowedHosts` setting, make sure the hostname in the URL is added to the allowed hosts. Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.config.createIncidentJson`
:   :::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a stringified JSON payload with Mustache variables that is sent to the create case URL to create a case. Required variables are `case.title` and `case.description`.

::::{note}
The JSON is validated after the Mustache variables have been placed when the REST method runs. You should manually ensure that the JSON is valid, disregarding the Mustache variables, so the later validation will pass. Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.config.createIncidentMethod`
:   ::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies the REST API HTTP request method to create a case in the third-party system

Data type: `string`<br>

Options:

* `post`
* `put`
* `patch`

Default: `post`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.createIncidentUrl`
:   :::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a REST API URL string to create a case in the third-party system.

::::{note}
If you are using the `xpack.actions.allowedHosts` setting, make sure the hostname in the URL is added to the allowed hosts. Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.config.createIncidentResponseKey`
:   ::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a string from the response body of the create case method that corresponds to the external service identifier.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.defaultModel`
:   ::::{admonition}
The default model to use for requests, which varies by connector:

* For an [{{bedrock}} connector](/reference/connectors-kibana/bedrock-action-type.md), current support is for the Anthropic Claude models. Defaults to `anthropic.claude-3-5-sonnet-20240620-v1:0`.
* For a [{{gemini}} connector](/reference/connectors-kibana/gemini-action-type.md), current support is for the Gemini models. Defaults to `gemini-1.5-pro-002`.
* For a [OpenAI connector](/reference/connectors-kibana/openai-action-type.md), it is optional and applicable only when `xpack.actions.preconfigured.<connector-id>.config.apiProvider` is `OpenAI`.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.executionTimeField`
:   ::::{admonition}
For an [index connector](/reference/connectors-kibana/index-action-type.md), a field that indicates when the document was indexed.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.from`
:   ::::{admonition}
For an [email connector](/reference/connectors-kibana/email-action-type.md), specifies the from address for all emails sent by the connector. It must be specified in `user@host-name` format.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.getIncidentResponseExternalTitleKey`
:   ::::{admonition}
* "For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a string from the response body of the get case method that corresponds to the external service title."

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.getIncidentUrl`
:   :::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a REST API URL string with an external service ID Mustache variable to get the case from the third-party system.

::::{note}
If you are using the `xpack.actions.allowedHosts` setting, make sure the hostname in the URL is added to the allowed hosts. Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.config.hasAuth`
:   ::::{admonition}
For an [email](/reference/connectors-kibana/email-action-type.md), [webhook](/reference/connectors-kibana/webhook-action-type.md), or [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies whether a user and password are required inside the secrets configuration.

Data type: `bool`<br> Default: `true`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.headers`
:   ::::{admonition}
For a [webhook](/reference/connectors-kibana/webhook-action-type.md) or [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a set of key-value pairs sent as headers with the request.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.host`
:   ::::{admonition}
For an [email connector](/reference/connectors-kibana/email-action-type.md), specifies the host name of the service provider.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.index`
:   ::::{admonition}
For an [index connector](/reference/connectors-kibana/index-action-type.md), specifies the Elasticsearch index.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.isOAuth`
:   ::::{admonition}
For a [{{sn-itsm}}](/reference/connectors-kibana/servicenow-action-type.md), [{{sn-sir}}](/reference/connectors-kibana/servicenow-sir-action-type.md), or [{{sn-itom}} connector](/reference/connectors-kibana/servicenow-itom-action-type.md), specifies whether to use basic or OAuth authentication.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.jwtKeyId`
:   ::::{admonition}
For a [{{sn-itsm}}](/reference/connectors-kibana/servicenow-action-type.md), [{{sn-sir}}](/reference/connectors-kibana/servicenow-sir-action-type.md), or [{{sn-itom}} connector](/reference/connectors-kibana/servicenow-itom-action-type.md), specifies the key ID assigned to the JWT verifier map of your OAuth application. It is required when `xpack.actions.preconfigured.<connector-id>.config.isOAuth` is `true`.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.mappings`
:   ::::{admonition}
For a [Swimlane connector](/reference/connectors-kibana/swimlane-action-type.md), specifies field mappings.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.mappings.alertIdConfig`
:   ::::{admonition}
For a [Swimlane connector](/reference/connectors-kibana/swimlane-action-type.md), field mapping for the alert identifier. You must provide `fieldtype`, `id`, `key`, and `name` values.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.mappings.caseIdConfig`
:   ::::{admonition}
For a [Swimlane connector](/reference/connectors-kibana/swimlane-action-type.md), field mapping for the case identifier. You must provide `fieldtype`, `id`, `key`, and `name` values.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.mappings.caseNameConfig`
:   ::::{admonition}
For a [Swimlane connector](/reference/connectors-kibana/swimlane-action-type.md), field mapping for the case name. You must provide `fieldtype`, `id`, `key`, and `name` values.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.mappings.commentsConfig`
:   ::::{admonition}
For a [Swimlane connector](/reference/connectors-kibana/swimlane-action-type.md), field mapping for the case comments. You must provide `fieldtype`, `id`, `key`, and `name` values.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.mappings.descriptionConfig`
:   ::::{admonition}
For a [Swimlane connector](/reference/connectors-kibana/swimlane-action-type.md), field mapping for the case description. You must provide `fieldtype`, `id`, `key`, and `name` values.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.mappings.ruleNameConfig`
:   ::::{admonition}
For a [Swimlane connector](/reference/connectors-kibana/swimlane-action-type.md), field mapping for the rule name. You must provide `fieldtype`, `id`, `key`, and `name` values.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.mappings.severityConfig`
:   ::::{admonition}
For a [Swimlane connector](/reference/connectors-kibana/swimlane-action-type.md), specifies a field mapping for the severity. You must provide `fieldtype`, `id`, `key`, and `name` values.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.method`
:   ::::{admonition}
For a [webhook connector](/reference/connectors-kibana/webhook-action-type.md), specifies the HTTP request method, either `post` or `put`. Defaults to `post`.

Data type: `enum`<br>

Options:

* `post`
* `put`

Default: `post`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.orgId`
:   ::::{admonition}
For an [{{ibm-r}} connector](/reference/connectors-kibana/resilient-action-type.md), specifies the {{ibm-r}} organization identifier.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.port`
:   ::::{admonition}
For an [email connector](/reference/connectors-kibana/email-action-type.md), specifies the port to connect to on the service provider.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.projectKey`
:   ::::{admonition}
For a [Jira connector](/reference/connectors-kibana/jira-action-type.md), specifies the Jira project key.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.secure`
:   ::::{admonition}
For an [email connector](/reference/connectors-kibana/email-action-type.md), specifies whether the connection will use TLS when connecting to the service provider. If not true, the connection will initially connect over TCP then attempt to switch to TLS via the SMTP STARTTLS command.

Data type: `bool`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.service`
:   ::::{admonition}
For an [email connector](/reference/connectors-kibana/email-action-type.md), specifies the name of the email service. For example, `elastic_cloud`, `exchange_server`, `gmail`, `other`, `outlook365`, or `ses`.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.tenantId`
:   ::::{admonition}
For an [email connector](/reference/connectors-kibana/email-action-type.md), specifies a GUID format value that corresponds to a tenant ID, which is a part of OAuth 2.0 client credentials authentication.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.updateIncidentJson`
:   :::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a stringified JSON payload with Mustache variables that is sent to the update case URL to update a case. Required variables are `case.title` and `case.description`.

::::{note}
The JSON is validated after the Mustache variables have been placed when the REST method runs. You should manually ensure that the JSON is valid, disregarding the Mustache variables, so the later validation will pass. Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.config.updateIncidentMethod`
:   ::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies the REST API HTTP request method to update the case in the third-party system.

Data type: `enum`<br>

Options:

* `post`
* `put`
* `patch`

Default: `put`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.updateIncidentUrl`
:   :::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies the REST API URL to update the case by ID in the third-party system.

::::{note}
If you are using the `xpack.actions.allowedHosts` setting, make sure the hostname in the URL is added to the allowed hosts. Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.config.url`
:   :::::{admonition}
A configuration URL that varies by connector:

* For a [D3 Security connector](/reference/connectors-kibana/d3security-action-type.md), specifies the D3 Security API request URL.
* For a [Tines connector](/reference/connectors-kibana/tines-action-type.md), specifies the Tines tenant URL.
* For a [webhook connector](/reference/connectors-kibana/webhook-action-type.md), specifies the web service request URL.

::::{note}
If you are using the `xpack.actions.allowedHosts` setting, make sure this hostname is added to the allowed hosts. Data type: `stringm`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.config.userIdentifierValue`
:   ::::{admonition}
For a [{{sn-itsm}}](/reference/connectors-kibana/servicenow-action-type.md), [{{sn-sir}}](/reference/connectors-kibana/servicenow-sir-action-type.md), or [{{sn-itom}} connector](/reference/connectors-kibana/servicenow-itom-action-type.md), specifies the user identifier. It is required when required when `xpack.actions.preconfigured.<connector-id>.config.isOAuth` is `true`.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.usesBasic`
:   ::::{admonition}
For an [xMatters connector](/reference/connectors-kibana/xmatters-action-type.md), specifies whether it uses HTTP basic authentication.

Data type: `bool`<br> Default: `true`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.usesTableApi`
:   ::::{admonition}
For a [{{sn-itsm}}](/reference/connectors-kibana/servicenow-action-type.md) or [{{sn-sir}} connector](/reference/connectors-kibana/servicenow-sir-action-type.md), specifies whether the connector uses the Table API or the Import Set API. If set to `false`, the Elastic application should be installed in ServiceNow.

Data type: `bool`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.viewIncidentUrl`
:   ::::{admonition}
For a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a URL string with either the external service ID or external service title Mustache variable to view a case in the external system.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.config.webhookIntegrationUrl`
:   ::::{admonition}
For a [Torq connector](/reference/connectors-kibana/torq-action-type.md), specifies the endpoint URL of the Elastic Security integration in Torq.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.name`
:   ::::{admonition}
The name of the preconfigured connector.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets`
:   :::::{admonition}
Sensitive configuration details, such as username, password, and keys, which are specific to the connector type.

::::{tip}
Sensitive properties, such as passwords, should be stored in the [Kibana keystore](docs-content://deploy-manage/security/secure-settings.md#creating-keystore). Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.secrets.accessKey`
:   ::::{admonition}
For an [{{bedrock}} connector](/reference/connectors-kibana/bedrock-action-type.md), specifies the AWS access key for authentication.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.apikey`
:   ::::{admonition}
An API key secret that varies by connector.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.credentialsJson`
:   ::::{admonition}
For an [{{gemini}} connector](/reference/connectors-kibana/gemini-action-type.md), specifies the GCP service account credentials JSON file for authentication.

* For a [OpenAI connector](/reference/connectors-kibana/openai-action-type.md), specifies the OpenAI or Azure OpenAI API key for authentication.
* For an [{{opsgenie}} connector](/reference/connectors-kibana/opsgenie-action-type.md), specifies the {{opsgenie}} API authentication key for HTTP basic authentication.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.apiKeyId`
:   ::::{admonition}
For an [{{ibm-r}} connector](/reference/connectors-kibana/resilient-action-type.md), specifies the authentication key ID for HTTP basic authentication.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.apiKeySecret`
:   ::::{admonition}
For an [{{ibm-r}} connector](/reference/connectors-kibana/resilient-action-type.md), specifies the authentication key secret for HTTP basic authentication.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.apiToken`
:   ::::{admonition}
For a [Jira](/reference/connectors-kibana/jira-action-type.md) or [{{swimlane}} connector](/reference/connectors-kibana/swimlane-action-type.md), specifies the API authentication token for HTTP basic authentication.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.clientSecret`
:   :::::{admonition}
A client secret that varies by connector:

* For an [email connector](/reference/connectors-kibana/email-action-type.md), specifies the client secret that you generated for your app in the app registration portal. It is required when the email service is `exchange_server`, which uses OAuth 2.0 client credentials authentication.
* For a [{{sn-itsm}}](/reference/connectors-kibana/servicenow-action-type.md), [{{sn-sir}}](/reference/connectors-kibana/servicenow-sir-action-type.md), or [{{sn-itom}} connector](/reference/connectors-kibana/servicenow-itom-action-type.md), specifies the client secret assigned to the OAuth application. It is required when `xpack.actions.preconfigured.<connector-id>.config.isOAuth` is `true`.

::::{note}
The client secret must be URL-encoded. Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.secrets.email`
:   ::::{admonition}
An email address that varies by connector:

* For a [Jira connector](/reference/connectors-kibana/jira-action-type.md), specifies the account email for HTTP basic authentication.
* For a [Tines connector](/reference/connectors-kibana/tines-action-type.md), specifies the email used to sign in to Tines.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.password`
:   ::::{admonition}
A password secret that varies by connector:

* For an [email](/reference/connectors-kibana/email-action-type.md), [webhook](/reference/connectors-kibana/webhook-action-type.md), or [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a password that is required when `xpack.actions.preconfigured.<connector-id>.config.hasAuth` is `true`.
* For a [{{sn-itsm}}](/reference/connectors-kibana/servicenow-action-type.md), [{{sn-sir}}](/reference/connectors-kibana/servicenow-sir-action-type.md), or [{{sn-itom}} connector](/reference/connectors-kibana/servicenow-itom-action-type.md), specifies a password that is required when `xpack.actions.preconfigured.<connector-id>.config.isOAuth` is `false`.
* For an [xMatters connector](/reference/connectors-kibana/xmatters-action-type.md), specifies a password that is required when `xpack.actions.preconfigured.<connector-id>.config.usesBasic` is `true`.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.privateKey`
:   ::::{admonition}
For a [{{sn-itsm}}](/reference/connectors-kibana/servicenow-action-type.md), [{{sn-sir}}](/reference/connectors-kibana/servicenow-sir-action-type.md), or [{{sn-itom}} connector](/reference/connectors-kibana/servicenow-itom-action-type.md), specifies the RSA private key. It is required when `xpack.actions.preconfigured.<connector-id>.config.isOAuth` is `true`.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.privateKeyPassword`
:   ::::{admonition}
For a [{{sn-itsm}}](/reference/connectors-kibana/servicenow-action-type.md), [{{sn-sir}}](/reference/connectors-kibana/servicenow-sir-action-type.md), or [{{sn-itom}} connector](/reference/connectors-kibana/servicenow-itom-action-type.md), specifies the password for the RSA private key.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.routingKey`
:   ::::{admonition}
For a [PagerDuty connector](/reference/connectors-kibana/pagerduty-action-type.md), specifies the 32 character PagerDuty Integration Key for an integration on a service, also referred to as the routing key.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.secret`
:   ::::{admonition}
For an [{{bedrock}} connector](/reference/connectors-kibana/bedrock-action-type.md), specifies the AWS secret for authentication.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.secretsUrl`
:   :::::{admonition}
For an [xMatters connector](/reference/connectors-kibana/xmatters-action-type.md) with URL authentication, specifies the request URL for the Elastic Alerts trigger in xMatters with the API key included in the URL. It is used only when `xpack.actions.preconfigured.<connector-id>.config.usesBasic` is `false`.

::::{note}
If you are using the `xpack.actions.allowedHosts` setting, make sure this hostname is added to the allowed hosts. Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.secrets.token`
:   ::::{admonition}
A token secret that varies by connector:

* For a [D3 Security conector](/reference/connectors-kibana/d3security-action-type.md), specifies the D3 Security token.
* For a [Slack connector](/reference/connectors-kibana/slack-action-type.md), specifies the Slack bot user OAuth token.
* For a [Tines connector](/reference/connectors-kibana/tines-action-type.md), specifies the Tines API token.
* For a [Torq connector](/reference/connectors-kibana/torq-action-type.md), specifies the secret of the webhook authentication header.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.user`
:   ::::{admonition}
A user name secret that varies by connector:

* For an [email](/reference/connectors-kibana/email-action-type.md), [webhook](/reference/connectors-kibana/webhook-action-type.md), or [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md), specifies a user name that is required when `xpack.actions.preconfigured.<connector-id>.config.hasAuth` is `true`.
* For an [xMatters connector](/reference/connectors-kibana/xmatters-action-type.md), specifies a user name that is required when `xpack.actions.preconfigured.<connector-id>.config.usesBasic` is `true`.

Data type: `string`<br>

::::



`xpack.actions.preconfigured.<connector-id>.secrets.webhookUrl`
:   :::::{admonition}
A URL that varies by connector:

* For a [Microsoft Teams](/reference/connectors-kibana/teams-action-type.md), specifies the URL of the incoming webhook.
* For a [Slack connector](/reference/connectors-kibana/slack-action-type.md), specifies the Slack webhook URL.

::::{note}
If you are using the `xpack.actions.allowedHosts` setting, make sure the hostname is added to the allowed hosts. Data type: `string`<br>
::::


:::::



`xpack.actions.preconfigured.<connector-id>.secrets.username`
:   ::::{admonition}
For a [{{sn-itsm}}](/reference/connectors-kibana/servicenow-action-type.md), [{{sn-sir}}](/reference/connectors-kibana/servicenow-sir-action-type.md), or [{{sn-itom}} connector](/reference/connectors-kibana/servicenow-itom-action-type.md), specifies a user name that is required when `xpack.actions.preconfigured.<connector-id>.config.isOAuth` is `false`.

Data type: `string`<br>

::::




## Alerting settings [alert-settings]

`xpack.alerting.cancelAlertsOnRuleTimeout` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies whether to skip writing alerts and scheduling actions if rule processing was cancelled due to a timeout. This setting can be overridden by individual rule types.

Data type: `bool`<br> Default: `true`<br>

::::



`xpack.alerting.rules.maxScheduledPerMinute`
:   ::::{admonition}
Specifies the maximum number of rules to run per minute.

Data type: `int`<br> Default: `10000`<br>

::::



`xpack.alerting.rules.minimumScheduleInterval.value` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies the minimum schedule interval for rules. This minimum is applied to all rules created or updated after you set this value. The time is formatted as a number and a time unit (`s`, `m`, `h`, or `d`). For example, `20m`, `24h`, `7d`. This duration cannot exceed `1d`.

Data type: `string`<br> Default: `1m`<br>

::::



`xpack.alerting.rules.minimumScheduleInterval.enforce` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies the behavior when a new or changed rule has a schedule interval less than the value defined in `xpack.alerting.rules.minimumScheduleInterval.value`. If `false`, rules with schedules less than the interval will be created but warnings will be logged. If `true`, rules with schedules less than the interval cannot be created.

Data type: `bool`<br> Default: `false`<br>

::::



`xpack.alerting.rules.run.actions.max` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies the maximum number of actions that a rule can generate each time detection checks run.

Data type: `int`<br>

::::



`xpack.alerting.rules.run.alerts.max` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   :::::{admonition}
Specifies the maximum number of alerts that a rule can generate each time detection checks run.

::::{warning}
The exact number of alerts your cluster can safely handle depends on your cluster configuration and workload, however setting a value higher than the default (`1000`) is not recommended or supported. Doing so could strain system resources and lead to performance issues, delays in alert processing, and potential disruptions during high alert activity periods. Data type: `int`<br> Default: `1000`<br>
::::


:::::



`xpack.alerting.rules.run.timeout` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Specifies the default timeout for tasks associated with all types of rules. The time is formatted as a number and a time unit (`ms`, `s`, `m`, `h`, `d`, `w`, `M`, or `Y`). For example, `20m`, `24h`, `7d`, `1w`. Default: `5m`.

Data type: `string`<br>

::::



`xpack.alerting.rules.run.ruleTypeOverrides` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Overrides the configs under `xpack.alerting.rules.run` for the rule type with the given ID. List the rule identifier and its settings in an array of objects.

Data type: `string`<br>

For example:

```yaml
xpack.alerting.rules.run:
    timeout: '5m'
    ruleTypeOverrides:
        - id: '.index-threshold'
          timeout: '15m'
```

::::



`xpack.alerting.rules.run.actions.connectorTypeOverrides` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   ::::{admonition}
Overrides the configs under `xpack.alerting.rules.run.actions` for the connector type with the given ID. List the connector type identifier and its settings in an array of objects.

Data type: `string`<br>

For example:

```yaml
xpack.alerting.rules.run:
    actions:
        max: 10
        connectorTypeOverrides:
            - id: '.server-log'
              max: 5
```

::::



