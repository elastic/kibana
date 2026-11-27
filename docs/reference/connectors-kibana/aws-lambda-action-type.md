---
navigation_title: "AWS Lambda"
type: reference
description: "Use the AWS Lambda connector to invoke Lambda functions, list functions, and get function details."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# AWS Lambda connector [aws-lambda-action-type]

The AWS Lambda connector calls the [AWS Lambda API](https://docs.aws.amazon.com/lambda/latest/api/welcome.html) to invoke functions, list the functions in a region, and read a function's configuration. Use it to run your own remediation or enrichment code in AWS.

You can use this connector in **Agent Builder** and **Workflows**.

## Create connectors in {{kib}} [define-aws-lambda-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [aws-lambda-connector-configuration]

AWS Lambda connectors have the following configuration properties:

AWS Region
:   The AWS Region where your Lambda functions are, for example `us-east-1`. All actions run against this single region. To work across multiple regions, create one connector per region.

### Authentication [aws-lambda-connector-authentication]

**AWS credentials**

Access Key ID
:   The AWS IAM access key ID used to sign every request with Signature Version 4 (SigV4).

Secret Access Key
:   The AWS IAM secret access key paired with the access key ID above.

## Test connectors [aws-lambda-test-connector]

You can test connectors when you create or edit the connector in {{kib}}. The test calls the Lambda `ListFunctions` API to verify that the credentials can authenticate against Lambda in the configured region.

## Connector actions [aws-lambda-connector-actions]

The AWS Lambda connector has the following actions:

`invoke`
:   Invoke a function by name or ARN (`functionName`), with an optional JSON `payload` and an optional version or alias (`qualifier`). Set `invocationType` to `RequestResponse` (the default) to wait for the result and the end of the execution log, `Event` to start the function without waiting, or `DryRun` to check permissions without running it.

`listFunctions`
:   List the functions in the configured region with their name, ARN, runtime, handler, memory, timeout, and last-modified date. Use `maxItems` to limit the number of functions returned, and pass the `nextMarker` from the response as `marker` to get the next page.

`getFunction`
:   Get the configuration of one function (`functionName`, optional `qualifier`): ARN, runtime, execution role, handler, timeout, memory, state, and last update status.

## Connector networking configuration [aws-lambda-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [aws-lambda-api-credentials]

1. Sign in to the [AWS IAM console](https://console.aws.amazon.com/iam/).
2. Create (or choose) an IAM user dedicated to this connector.
3. Attach a policy granting at least the following actions:
   - `lambda:InvokeFunction` and `lambda:GetFunction`, scoped to the functions you want the connector to use
   - `lambda:ListFunctions`, which applies to all functions in the account (`*`)
4. Create an access key for that user (**Security credentials** > **Access keys** > **Create access key**).
5. Copy the **Access key ID** and **Secret access key**, and enter them along with the AWS Region when configuring the connector in {{kib}}.
