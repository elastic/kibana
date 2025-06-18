---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/pre-configured-connectors.html
---

# Preconfigured connectors [pre-configured-connectors]

If you are running {{kib}} on-prem, you can preconfigure a connector to have all the information it needs prior to startup by adding it to the `kibana.yml` file.

::::{note}
{{ech}} provides a preconfigured email connector but you cannot create additional preconfigured connectors.
::::


Preconfigured connectors offer the following benefits:

* Require no setup. Configuration and credentials needed to run an action are predefined, including the connector name and ID.
* Appear in all spaces because they are not saved objects.
* Cannot be edited or deleted.


## Create preconfigured connectors [create-preconfigured-connectors]

Add `xpack.actions.preconfigured` settings to your `kibana.yml` file. The settings vary depending on which type of connector you’re adding. Refer to [Preconfigured connector settings](/reference/configuration-reference/alerting-settings.md#preconfigured-connector-settings).

This example shows a valid configuration for a Slack connector and a Webhook connector:

```js
  xpack.actions.preconfigured:
    my-slack1:                  <1>
      actionTypeId: .slack      <2>
      name: 'Slack #xyz'        <3>
      secrets:
        webhookUrl: 'https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz'
    webhook-service:
      actionTypeId: .webhook
      name: 'Email service'
      config:                   <4>
        url: 'https://email-alert-service.elastic.co'
        method: post
        headers:
          header1: value1
          header2: value2
      secrets:                  <5>
        user: elastic
        password: changeme
      exposeConfig: true        <6>
```

1. The key is the connector identifier, `my-slack1` in this example.
2. `actionTypeId` is the action type identifier.
3. `name` is the name of the preconfigured connector.
4. `config` is the configuration specific to the connector type.
5. `secrets` is the sensitive configuration, such as username, password, and keys, specific to the connector type.
6. `exposeConfig` is the optional boolean flag, which identify if connector config will be exposed in the actions API


::::{note}
Sensitive properties, such as passwords, can also be stored in the [{{kib}} keystore](docs-content://deploy-manage/security/secure-settings.md#creating-keystore).

::::



## View preconfigured connectors [managing-preconfigured-connectors]

go to the **{{connectors-ui}}** page using the navigation menu or the [global search field](docs-content://get-started/the-stack.md#kibana-navigation-search). Preconfigured connectors appear regardless of which space you are in. They are tagged as “preconfigured”, and you cannot delete them.

% TO DO: Use `:class: screenshot`
![Connectors managing tab with pre-configured](../images/preconfigured-connectors-managing.png)

Clicking a preconfigured connector shows the description, but not the configuration.


## Built-in preconfigured connectors [built-in-preconfigured-connectors]

{{kib}} provides the following built-in preconfigured connectors:

* [Preconfigured alert history {{es}} index connector](#preconfigured-connector-alert-history)
* [`Elastic-Cloud-SMTP` preconfigured email connector](/reference/connectors-kibana/email-action-type.md#elasticcloud)


### Preconfigured alert history {{es}} index connector [preconfigured-connector-alert-history]

::::{warning}
This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
::::


{{kib}} offers a preconfigured index connector to facilitate indexing active alert data into {{es}}. To use this connector, set [`xpack.actions.preconfiguredAlertHistoryEsIndex`](/reference/configuration-reference/alerting-settings.md#action-settings) to `true`.

When you subsequently create rules, you can use the `Alert history Elasticsearch index (preconfigured)` connector.

% TO DO: Use `:class: screenshot`
![Creating a rule action that uses the pre-configured alert history connector](../images/pre-configured-alert-history-connector.png)

Documents are indexed using a preconfigured schema that captures the [action variables](docs-content://explore-analyze/alerts-cases/alerts/create-manage-rules.md#defining-rules-actions-variables) available for the rule. By default, these documents are indexed into the `kibana-alert-history-default` index, but you can specify a different index. Index names must start with `kibana-alert-history-` to take advantage of the preconfigured alert history index template.

::::{important}
* To write documents to the preconfigured index, you must have `all` or `write` privileges to the `kibana-alert-history-*` indices.
* The `kibana-alert-history-*` indices are not configured to use ILM so they must be maintained manually. If the index size grows large, consider using the [delete by query](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-by-query) API to clean up older documents in the index.

::::



## Examples [preconfigured-connector-examples]

* [{{bedrock}} connectors](#preconfigured-bedrock-configuration)
* [D3 Security connectors](#preconfigured-d3security-configuration)
* [Email connectors](#preconfigured-email-configuration)
* [OpenAI connectors](#preconfigured-gen-ai-configuration)
* [{{ibm-r}} connectors](#preconfigured-resilient-configuration)
* [Index connectors](#preconfigured-index-configuration)
* [Jira connectors](#preconfigured-jira-configuration)
* [Microsoft Teams connectors](#preconfigured-teams-configuration)
* [{{opsgenie}} connectors](#preconfigured-opsgenie-configuration)
* [PagerDuty connectors](#preconfigured-pagerduty-configuration)
* [Server log connectors](#preconfigured-server-log-configuration)
* [{{sn-itom}} connectors](#preconfigured-servicenow-itom-configuration)
* [{{sn-itsm}} connectors](#preconfigured-servicenow-configuration)
* [{{sn-sir}} connectors](#preconfigured-servicenow-sir-configuration)
* [Slack connectors](#preconfigured-slack-configuration)
* [Swimlane connectors](#preconfigured-swimlane-configuration)
* [Torq connectors](#preconfigured-torq-configuration)
* [Tines connectors](#preconfigured-tines-configuration)
* [Webhook connectors](#preconfigured-webhook-configuration)
* [{{webhook-cm}} connectors](#preconfigured-cases-webhook-configuration)
* [xMatters connectors](#preconfigured-xmatters-configuration)


### {{bedrock}} connectors [preconfigured-bedrock-configuration]

The following example creates an [{{bedrock}} connector](/reference/connectors-kibana/bedrock-action-type.md):

```text
xpack.actions.preconfigured:
  my-bedrock:
    name: preconfigured-bedrock-connector-type
    actionTypeId: .bedrock
    config:
      apiUrl: https://bedrock-runtime.us-east-1.amazonaws.com <1>
      defaultModel: anthropic.claude-3-5-sonnet-20240620-v1:0 <2>
    secrets:
      accessKey: key-value <3>
      secret: secret-value <4>
```

1. The {{bedrock}} request URL.
2. The default model to use for requests. Current support is for the Anthropic Claude models, defaulting to Claude 2.
3. The AWS access key for authentication.
4. The AWS secret for authentication.



### D3 Security connectors [preconfigured-d3security-configuration]

The following example creates a [D3 Security connector](/reference/connectors-kibana/d3security-action-type.md):

```text
xpack.actions.preconfigured:
  my-d3security:
    name: preconfigured-d3security-connector-type
    actionTypeId: .d3security
    config:
      url: https://testurl.com/elasticsearch/VSOC/api/Data/Kibana/Security%20Operations/CreateEvents <1>
    secrets:
      token: superlongtoken <2>
```

1. The D3 Security API request URL.
2. The D3 Security token.



### Email connectors [preconfigured-email-configuration]

The following example creates an [email connector](/reference/connectors-kibana/email-action-type.md):

```text
xpack.actions.preconfigured:
  my-email:
    name: preconfigured-email-connector-type
    actionTypeId: .email
    config:
      service: other <1>
      from: testsender@test.com <2>
      host: validhostname <3>
      port: 8080 <4>
      secure: false <5>
      hasAuth: true <6>
    secrets:
      user: testuser <7>
      password: passwordkeystorevalue <8>
```

1. The name of the email service. If `service` is `elastic_cloud` (for Elastic Cloud notifications) or one of Nodemailer’s well-known email service providers, the `host`, `port`, and `secure` properties are ignored. If `service` is `other`, the `host` and `port` properties must be defined. For more information on the `gmail` service value, refer to [Nodemailer Gmail documentation](https://nodemailer.com/usage/using-gmail/). If `service` is `exchange_server`, the `tenantId`, `clientId`, `clientSecret` properties are required instead of `host` and `port`.
2. The email address for all emails sent with this connector. It must be specified in `user@host-name` format.
3. The host name of the service provider.
4. The port to connect to on the service provider.
5. If true, the connection will use TLS when connecting to the service provider.
6. If `true`, this connector will require values for `user` and `password` inside the secrets configuration. Defaults to `true`.
7. A user name for authentication. Required if `hasAuth` is set to `true`.
8. A password for authentication. Should be stored in the [{{kib}} keystore](docs-content://deploy-manage/security/secure-settings.md#creating-keystore). Required if `hasAuth` is set to `true`.



#### Amazon SES (Simple Email Service) [preconfigured-email-configuration-amazon-ses]

Use the following email connector configuration to send email from the [Amazon Simple Email Service](http://aws.amazon.com/ses) (SES) SMTP service:

```text
config:
    service: ses
    // `host`, `port` and `secure` have the following default values and do not need to set:
    // host: email-smtp.us-east-1.amazonaws.com <1>
    // port: 465
    // secure: true
secrets:
    user: <username>
    password: <password>
```

1. `config.host` varies depending on the region



#### Gmail [preconfigured-email-configuration-gmail]

Use the following email connector configuration to send email from the [Gmail](https://mail.google.com) SMTP service:

```text
  config:
    service: gmail
    // `host`, `port` and `secure` have the following default values and do not need to set:
    // host: smtp.gmail.com
    // port: 465
    // secure: true
  secrets:
    user: <username>
    password: <password>
```


#### Microsoft Exchange with basic authentication [preconfigured-email-configuration-exchange-basic-auth]

:::{admonition} Deprecated in 7.16.0
Microsoft Exchange with basic authentication was deprecated in 7.16.0.
:::

```text
config:
    service: other
    host: <your exchange server>
    port: 465
    secure: true
    from: <email address of service account> <1>
secrets:
    user: <email address of service account> <2>
    password: <password>
```

1. Some organizations configure Exchange to validate that the `from` field is a valid local email account.
2. Many organizations support use of your email address as your username. Check with your system administrator if you receive authentication-related failures.



#### Microsoft Exchange with OAuth 2.0 [preconfigured-email-configuration-exchange]

Use the following email connector configuration to send email from Microsoft Exchange:

```text
config:
    service: exchange_server
    clientId: <The Application (client) ID> <1>
    tenantId: <The directory tenant ID, in GUID format.>
    from: <email address of service account> <2>
secrets:
    clientSecret: <URL-encoded string>
```

1. This application information is on the [Azure portal – App registrations](https://go.microsoft.com/fwlink/?linkid=2083908).
2. Some organizations configure Exchange to validate that the `from` field is a valid local email account.



#### Outlook.com [preconfigured-email-configuration-outlook]

Use the following email connector configuration to send email from the [Outlook.com](https://www.outlook.com/) SMTP service:

```text
config:
    service: outlook365
    // `host`, `port` and `secure` have the following default values and do not need to set:
    // host: smtp.office365.com
    // port: 587
    // secure: false
secrets:
    user: <email.address>
    password: <password>
```


### OpenAI connectors [preconfigured-gen-ai-configuration]

The following example creates a [OpenAI connector](/reference/connectors-kibana/openai-action-type.md):

```text
xpack.actions.preconfigured:
  my-open-ai:
    name: preconfigured-openai-connector-type
    actionTypeId: .gen-ai
    config:
      apiUrl: https://api.openai.com/v1/chat/completions <1>
      apiProvider: 'OpenAI' <2>
      defaultModel: gpt-4.1 <3>
    secrets:
      apiKey: superlongapikey <4>
```

1. The OpenAI request URL.
2. The OpenAI API provider, either `OpenAI` or `Azure OpenAI`.
3. The default model to use for requests. This setting is optional and applicable only when `apiProvider` is `OpenAI`.
4. The OpenAI or Azure OpenAI API key for authentication.



### {{ibm-r}} connectors [preconfigured-resilient-configuration]

The following example creates a [{{ibm-r}} connector](/reference/connectors-kibana/resilient-action-type.md):

```text
xpack.actions.preconfigured:
 my-resilient:
    name: preconfigured-resilient-connector-type
    actionTypeId: .resilient
    config:
      apiUrl: https://elastic.resilient.net <1>
      orgId: ES <2>
    secrets:
      apiKeyId: testuser <3>
      apiKeySecret: tokenkeystorevalue <4>
```

1. The {{ibm-r}} instance URL.
2. The {{ibm-r}} organization identifier.
3. The authentication key ID for HTTP basic authentication.
4. The authentication key secret for HTTP basic authentication.

    :::{note}
    This value should be stored in the [{{kib}} keystore](docs-content://deploy-manage/security/secure-settings.md#creating-keystore).
    :::



### Index connectors [preconfigured-index-configuration]

The following example creates a [index connector](/reference/connectors-kibana/index-action-type.md):

```text
xpack.actions.preconfigured:
  my-index:
    name: preconfigured-index-connector-type
    actionTypeId: .index
    config:
      index: .kibana <1>
      executionTimeField: my-field <2>
```

1. The {{es}} index to be written to.
2. A field that indicates when the document was indexed.



### Jira connectors [preconfigured-jira-configuration]

The following example creates a [Jira connector](/reference/connectors-kibana/jira-action-type.md):

```text
xpack.actions.preconfigured:
  my-jira:
    name: preconfigured-jira-connector-type
    actionTypeId: .jira
    config:
      apiUrl: https://elastic.atlassian.net <1>
      projectKey: ES <2>
    secrets:
      email: testuser <3>
      apiToken: tokenkeystorevalue <4>
```

1. The Jira instance URL.
2. The Jira project key.
3. The account email for HTTP basic authentication.
4. The API authentication token for HTTP basic authentication.

    :::{note}
    This value should be stored in the [{{kib}} keystore](docs-content://deploy-manage/security/secure-settings.md#creating-keystore).
    :::



### Microsoft Teams connectors [preconfigured-teams-configuration]

The following example creates a [Microsoft Teams connector](/reference/connectors-kibana/teams-action-type.md):

```text
xpack.actions.preconfigured:
  my-teams:
    name: preconfigured-teams-connector-type
    actionTypeId: .teams
    secrets:
      webhookUrl: 'https://outlook.office.com/webhook/abcd@0123456/IncomingWebhook/abcdefgh/ijklmnopqrstuvwxyz' <1>
```

1. The URL of the incoming webhook.



### {{opsgenie}} connectors [preconfigured-opsgenie-configuration]

The following example creates an [{{opsgenie}} connector](/reference/connectors-kibana/opsgenie-action-type.md):

```text
xpack.actions.preconfigured:
  my-opsgenie:
    name: preconfigured-opsgenie-connector-type
    actionTypeId: .opsgenie
    config:
      apiUrl: https://api.opsgenie.com <1>
    secrets:
      apiKey: apikey <2>
```

1. The {{opsgenie}} URL.
2. The {{opsgenie}} API authentication key for HTTP basic authentication.



### PagerDuty connectors [preconfigured-pagerduty-configuration]

The following example creates a [PagerDuty connector](/reference/connectors-kibana/pagerduty-action-type.md):

```text
xpack.actions.preconfigured:
  my-pagerduty:
    name: preconfigured-pagerduty-connector-type
    actionTypeId: .pagerduty
    config:
      apiUrl: https://test.host <1>
    secrets:
      routingKey: testroutingkey <2>
```

1. The PagerDuty event URL.
2. A 32 character PagerDuty Integration Key for an integration on a service, also referred to as the routing key.



### Server log connectors [preconfigured-server-log-configuration]

The following example creates a [server log connector](/reference/connectors-kibana/server-log-action-type.md):

```text
xpack.actions.preconfigured:
  my-server-log:
    name: preconfigured-server-log-connector-type
    actionTypeId: .server-log
```


### {{sn-itom}} connectors [preconfigured-servicenow-itom-configuration]

The following example creates a [{{sn-itom}} connector](/reference/connectors-kibana/servicenow-itom-action-type.md) with basic authentication:

```text
xpack.actions.preconfigured:
  my-servicenow-itom:
    name: preconfigured-servicenow-connector-type
    actionTypeId: .servicenow-itom
    config:
      apiUrl: https://example.service-now.com/ <1>
    secrets:
      username: testuser <2>
      password: passwordkeystorevalue <3>
```

1. The ServiceNow instance URL.
2. A user name.
3. A password.

    :::{note}
    This value should be stored in the [{{kib}} keystore](docs-content://deploy-manage/security/secure-settings.md#creating-keystore).
    :::


The following example creates a {{sn-itom}} connector with OAuth authentication:

```text
xpack.actions.preconfigured:
  my-servicenow:
    name: preconfigured-oauth-servicenow-connector-type
    actionTypeId: .servicenow-itom
    config:
      apiUrl: https://example.service-now.com/
      isOAuth: true <1>
      userIdentifierValue: testuser@email.com <2>
      clientId: abcdefghijklmnopqrstuvwxyzabcdef <3>
      jwtKeyId: fedcbazyxwvutsrqponmlkjihgfedcba <4>
    secrets:
      clientSecret: secretsecret <5>
      privateKey: |  <6>
        -----BEGIN RSA PRIVATE KEY-----
        MIIE...
        KAgD...
        ... multiple lines of key data ...
        -----END RSA PRIVATE KEY-----
```

1. Specifies whether the connector uses basic or OAuth authentication.
2. The user identifier.
3. The client identifier assigned to your OAuth application.
4. The key identifier assigned to the JWT verifier map of your OAuth application.
5. The client secret assigned to your OAuth application.
6. The RSA private key in multiline format. If it has a password, you must also provide `privateKeyPassword`.



### {{sn-itsm}} connectors [preconfigured-servicenow-configuration]

The following example creates a [{{sn-itsm}} connector](/reference/connectors-kibana/servicenow-action-type.md) with basic authentication:

```text
xpack.actions.preconfigured:
  my-servicenow:
    name: preconfigured-servicenow-connector-type
    actionTypeId: .servicenow
    config:
      apiUrl: https://example.service-now.com/ <1>
      usesTableApi: false <2>
    secrets:
      username: testuser <3>
      password: passwordkeystorevalue <4>
```

1. The ServiceNow instance URL.
2. Specifies whether the connector uses the Table API or the Import Set API. If `usesTableApi` is `false`, the Elastic application should be installed in {{sn}}.
3. The user name.
4. The password.

    :::{note}
    This value should be stored in the [{{kib}} keystore](docs-content://deploy-manage/security/secure-settings.md#creating-keystore).
    :::


The following example creates a {{sn-itsm}} connector with OAuth authentication:

```text
xpack.actions.preconfigured:
  my-servicenow:
    name: preconfigured-oauth-servicenow-connector-type
    actionTypeId: .servicenow
    config:
      apiUrl: https://example.service-now.com/
      usesTableApi: false
      isOAuth: true <1>
      userIdentifierValue: testuser@email.com <2>
      clientId: abcdefghijklmnopqrstuvwxyzabcdef <3>
      jwtKeyId: fedcbazyxwvutsrqponmlkjihgfedcba <4>
    secrets:
      clientSecret: secretsecret <5>
      privateKey: | <6>
        -----BEGIN RSA PRIVATE KEY-----
        MIIE...
        KAgD...
        ... multiple lines of key data ...
        -----END RSA PRIVATE KEY-----
```

1. Specifies whether the connector uses basic or OAuth authentication.
2. The user identifier.
3. The client identifier assigned to your OAuth application.
4. The key ID assigned to the JWT verifier map of your OAuth application.
5. The client secret assigned to the OAuth application.
6. The RSA private key in multiline format. If it has a password, you must also provide `privateKeyPassword`.



### {{sn-sir}} connectors [preconfigured-servicenow-sir-configuration]

The following example creates a [{{sn-sir}} connector](/reference/connectors-kibana/servicenow-sir-action-type.md) with basic authentication:

```text
xpack.actions.preconfigured:
  my-servicenow-sir:
    name: preconfigured-servicenow-connector-type
    actionTypeId: .servicenow-sir
    config:
      apiUrl: https://example.service-now.com/ <1>
      usesTableApi: false <2>
    secrets:
      username: testuser <3>
      password: passwordkeystorevalue <4>
```

1. The ServiceNow instance URL.
2. Specifies whether the connector uses the Table API or the Import Set API. If `usesTableApi` is false, the Elastic application should be installed in {{sn}}.
3. The user name.
4. The password.

    :::{note}
    This value should be stored in the [{{kib}} keystore](docs-content://deploy-manage/security/secure-settings.md#creating-keystore).
    :::


The following example creates a {{sn-sir}} connector with OAuth authentication:

```text
xpack.actions.preconfigured:
  my-servicenow:
    name: preconfigured-oauth-servicenow-connector-type
    actionTypeId: .servicenow-sir
    config:
      apiUrl: https://example.service-now.com/
      usesTableApi: false
      isOAuth: true <1>
      userIdentifierValue: testuser@email.com <2>
      clientId: abcdefghijklmnopqrstuvwxyzabcdef <3>
      jwtKeyId: fedcbazyxwvutsrqponmlkjihgfedcba <4>
    secrets:
      clientSecret: secretsecret <5>
      privateKey: | <6>
        -----BEGIN RSA PRIVATE KEY-----
        MIIE...
        KAgD...
        ... multiple lines of key data ...
        -----END RSA PRIVATE KEY-----
```

1. Specifies whether the connector uses basic or OAuth authentication.
2. The user identifier.
3. The client identifier assigned to the OAuth application.
4. The key ID assigned to the JWT verifier map of your OAuth application.
5. The client secret assigned to the OAuth application.
6. The RSA private key in multiline format. If it has a password, you must also specify `privateKeyPassword`.



### Slack connectors [preconfigured-slack-configuration]

The following example creates a [Slack connector](/reference/connectors-kibana/slack-action-type.md) with webhook:

```text
xpack.actions.preconfigured:
  my-slack:
    name: preconfigured-slack-webhook-connector-type
    actionTypeId: .slack
    secrets:
      webhookUrl: 'https://hooks.slack.com/services/xxxx/xxxx/xxxx' <1>
```

1. The Slack webhook URL.


The following example creates a Slack connector with web API:

```text
xpack.actions.preconfigured:
  my-slack:
    name: preconfigured-slack-api-connector-type
    actionTypeId: .slack_api
    secrets:
      token: 'xoxb-xxxx-xxxx-xxxx' <1>
```

1. The Slack bot user OAuth token.



### Swimlane connectors [preconfigured-swimlane-configuration]

The following example creates a [Swimlane connector](/reference/connectors-kibana/swimlane-action-type.md):

```text
xpack.actions.preconfigured:
  my-swimlane:
    name: preconfigured-swimlane-connector-type
    actionTypeId: .swimlane
    config:
      apiUrl: https://elastic.swimlaneurl.us <1>
      appId: app-id <2>
      mappings: <3>
        alertIdConfig:
          fieldType: text
          id: agp4s
          key: alert-id
          name: Alert ID
        caseIdConfig:
          fieldType: text
          id: ae1mi
          key: case-id
          name: Case ID
        caseNameConfig:
          fieldType: text
          id: anxnr
          key: case-name
          name: Case Name
        commentsConfig:
          fieldType: comments
          id: au18d
          key: comments
          name: Comments
        descriptionConfig:
          fieldType: text
          id: ae1gd
          key: description
          name: Description
        ruleNameConfig:
          fieldType: text
          id: avfsl
          key: rule-name
          name: Rule Name
        severityConfig:
          fieldType: text
          id: a71ik
          key: severity
          name: severity
    secrets:
      apiToken: tokenkeystorevalue <4>
```

1. The {{swimlane}} instance URL.
2. The {{swimlane}} application identifier.
3. Field mappings for properties such as the alert identifer, severity, and rule name.
4. The API authentication token for HTTP basic authentication.

    :::{note}
    This value should be stored in the [{{kib}} keystore](docs-content://deploy-manage/security/secure-settings.md#creating-keystore).
    :::



### Tines connectors [preconfigured-tines-configuration]

The following example creates a [Tines connector](/reference/connectors-kibana/tines-action-type.md):

```text
xpack.actions.preconfigured:
my-tines:
    name: preconfigured-tines-connector-type
    actionTypeId: .tines
    config:
      url: https://some-tenant-2345.tines.com <1>
    secrets:
      email: some.address@test.com <2>
      token: ausergeneratedapitoken <3>
```

1. The Tines tenant URL.
2. The email used to sign in to Tines.
3. The Tines API token.



### Torq connectors [preconfigured-torq-configuration]

The following example creates a [Torq connector](/reference/connectors-kibana/torq-action-type.md):

```yaml
xpack.actions.preconfigured:
  my-torq:
    name: preconfigured-torq-connector-type
    actionTypeId: .torq
    config:
      webhookIntegrationUrl: https://hooks.torq.io/v1/somehook <1>
    secrets:
      token: mytorqtoken <2>
```

1. The endpoint URL of the Elastic Security integration in Torq.
2. The secret of the webhook authentication header.



### Webhook connectors [preconfigured-webhook-configuration]

The following example creates a [webhook connector](/reference/connectors-kibana/webhook-action-type.md) with basic authentication:

```text
xpack.actions.preconfigured:
  my-webhook:
    name: preconfigured-webhook-connector-type
    actionTypeId: .webhook
    config:
      url: https://test.host <1>
      method: post <2>
      headers: <3>
        testheader: testvalue
      hasAuth: true <4>
    secrets:
      user: testuser <5>
      password: passwordkeystorevalue <6>
```

1. The web service request URL. If you are using the [`xpack.actions.allowedHosts`](/reference/configuration-reference/alerting-settings.md#action-settings) setting, make sure the hostname is added to the allowed hosts.
2. The HTTP request method, either `post`(default) or `put`.
3. A set of key-value pairs sent as headers with the request.
4. If `true`, this connector will require values for `user` and `password` inside the secrets configuration. Defaults to `true`.
5. A valid user name. Required if `hasAuth` is set to `true`.
6. A valid password. Required if `hasAuth` is set to `true`.

    :::{note}
    This value should be stored in the [{{kib}} keystore](docs-content://deploy-manage/security/secure-settings.md#creating-keystore).
    :::

::::{note}
SSL authentication is not supported in preconfigured webhook connectors.
::::



### {{webhook-cm}} connectors [preconfigured-cases-webhook-configuration]

The following example creates a [{{webhook-cm}} connector](/reference/connectors-kibana/cases-webhook-action-type.md):

```text
xpack.actions.preconfigured:
  my-case-management-webhook:
    name: Case Management Webhook Connector
    actionTypeId: .cases-webhook
    config:
      hasAuth: true <1>
      headers: <2>
        'content-type': 'application/json'
      createIncidentUrl: 'https://example.com/rest/api/2/issue' <3>
      createIncidentMethod: 'post' <4>
      createIncidentJson: '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"labels":{{{case.tags}}}' <5>
      getIncidentUrl: 'https://example.com/rest/api/2/issue/{{{external.system.id}}}' <6>
      getIncidentResponseExternalTitleKey: 'key' <7>
      viewIncidentUrl: 'https://example.com/browse/{{{external.system.title}}}' <8>
      updateIncidentUrl: 'https://example.com/rest/api/2/issue/{{{external.system.id}}}' <9>
      updateIncidentMethod: 'put' <10>
      updateIncidentJson: '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"labels":{{{case.tags}}}' <11>
      createCommentMethod: 'post', <12>
      createCommentUrl: 'https://example.com/rest/api/2/issue/{{{external.system.id}}}/comment', <13>
      createCommentJson: '{"body": {{{case.comment}}}}', <14>
    secrets:
      user: testuser <15>
      password: passwordvalue <16>
```

1. If `true`, this connector will require values for `user` and `password` inside the secrets configuration.
2. A set of key-value pairs sent as headers with the request.
3. A REST API URL string to create a case in the third-party system.
4. The REST API HTTP request method to create a case in the third-party system.
5. A stringified JSON payload with Mustache variables that is sent to the create case URL to create a case.
6. A REST API URL string with an external service ID Mustache variable to get the case from the third-party system.
7. A string from the response body of the get case method that corresponds to the external service title.
8. A URL string with either the external service ID or external service title Mustache variable to view a case in the external system.
9. The REST API URL to update the case by ID in the third-party system.
10. The REST API HTTP request method to update the case in the third-party system.
11. A stringified JSON payload with Mustache variables that is sent to the update case URL to update a case.
12. The REST API HTTP request method to create a case comment in the third-party system.
13. A REST API URL string to create a case comment by ID in the third-party system.
14. A stringified JSON payload with Mustache variables that is sent to the create comment URL to create a case comment.
15. A user name, which is required when `hasAuth` is `true`.
16. A password, which is required when `hasAuth` is `true`.



### xMatters connectors [preconfigured-xmatters-configuration]

The following example creates an [xMatters connector](/reference/connectors-kibana/xmatters-action-type.md) with basic authentication:

```text
xpack.actions.preconfigured:
  my-xmatters:
    name: preconfigured-xmatters-connector-type
    actionTypeId: .xmatters
    config:
      configUrl: https://test.host <1>
      usesBasic: true <2>
    secrets:
      user: testuser <3>
      password: passwordkeystorevalue <4>
```

1. The request URL for the Elastic Alerts trigger in xMatters.
2. Indicates whether the connector uses HTTP basic authentication. If `true`, you must provide `user` and `password` values. Defaults to `true`.
3. A user name for authentication, which is required when `usesBasic` is `true`.
4. A password for authentication, which is required when `usesBasic` is `true`.

    :::{note}
    This value should be stored in the [{{kib}} keystore](docs-content://deploy-manage/security/secure-settings.md#creating-keystore).
    :::


The following example creates an xMatters connector with URL authentication:

```text
xpack.actions.preconfigured:
  my-xmatters:
    name: preconfigured-xmatters-connector-type
    actionTypeId: .xmatters
    config:
      usesBasic: false <1>
    secrets:
      secretsUrl: https://test.host?apiKey=1234-abcd <2>
```

1. Indicates whether the connector uses HTTP basic authentication. Set to `false` to use URL authentication. Defaults to `true`.
2. The request URL for the Elastic Alerts trigger in xMatters with the API key included in the URL.


