---
navigation_title: "AWS"
type: reference
description: "Use the AWS connector to send signed requests to any AWS service API, such as IAM, EC2, S3, or CloudWatch Logs."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# AWS connector [aws-action-type]

The AWS connector sends requests to any AWS service API and signs each one with [AWS Signature Version 4 (SigV4)](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html). Use it to call AWS services that do not have a dedicated connector, for example to deactivate an IAM access key, read an EC2 instance, or block public access to an S3 bucket.

This connector is currently available in **Workflows** only.

## Create connectors in {{kib}} [define-aws-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Authentication [aws-connector-authentication]

**AWS credentials**

Access Key ID
:   The AWS IAM access key ID used to sign every request with SigV4.

Secret Access Key
:   The AWS IAM secret access key paired with the access key ID above.

The connector has no region setting. Each request sets its own service and region.

## Test connectors [aws-test-connector]

You can test connectors when you create or edit the connector in {{kib}}. The test calls the STS `GetCallerIdentity` API to verify that AWS accepts the credentials. If the global STS endpoint does not recognize the key, the test tries the AWS GovCloud (US) endpoint once.

## Connector actions [aws-connector-actions]

The AWS connector has the following action:

`request`
:   Send a signed request to an AWS service API and return the response `status`, `headers`, and `data`. JSON responses are parsed. XML responses, for example from EC2, are returned as text. If AWS returns an error status, the action fails with the AWS error message.

The `request` action has the following inputs:

`service`
:   (Required) The AWS endpoint prefix, used as the first part of the hostname. For example `iam`, `sts`, `ec2`, `s3`, `logs`, `securityhub`, or `guardduty`.

`region`
:   (Optional) The AWS region, for example `us-east-1`. The request goes to `https://{service}.{region}.amazonaws.com`. Omit it for global services such as IAM. Those requests go to `https://{service}.amazonaws.com` and are signed in `us-east-1`. China (`cn-*`) regions are not supported.

`method`
:   (Optional) The HTTP method: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, or `DELETE`. Defaults to `GET`.

`path`
:   (Optional) The request path, starting with `/`. Defaults to `/`.

`query`
:   (Optional) Query string parameters, for example `{ "Action": "ListUsers", "Version": "2010-05-08" }`.

`headers`
:   (Optional) Extra request headers. Any other value is serialized to JSON. Set `Content-Type` to match, for example `application/json`, or `application/x-amz-json-1.1` together with `X-Amz-Target`.

`body`
:   (Optional) The request body. A string is sent as is, for example a form-encoded body. Any other value is sent as JSON.

`signingName`
:   (Optional) The SigV4 signing name, when it is different from `service`. For example, `bedrock-runtime` signs as `bedrock`. Defaults to `service`.

### Examples [aws-connector-examples]

APIs such as IAM, STS, and EC2 take an `Action`, a `Version`, and the parameters for that action. This workflow step lists the access keys of an IAM user:

```yaml
- name: list_access_keys
  type: aws.request
  connector-id: my-aws-connector
  with:
    service: iam
    query:
      Action: ListAccessKeys
      Version: "2010-05-08"
      UserName: jane.doe
```

AWS JSON APIs, such as CloudWatch Logs and CloudTrail, take a JSON body and name the operation in the `X-Amz-Target` header. This workflow step lists five log groups:

```yaml
- name: list_log_groups
  type: aws.request
  connector-id: my-aws-connector
  with:
    service: logs
    region: us-east-1
    method: POST
    headers:
      Content-Type: application/x-amz-json-1.1
      X-Amz-Target: Logs_20140328.DescribeLogGroups
    body:
      limit: 5
```

Later steps read the parsed response from `steps.list_log_groups.output.data`.

## Connector networking configuration [aws-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [aws-api-credentials]

1. Sign in to the [AWS IAM console](https://console.aws.amazon.com/iam/).
2. Create (or choose) an IAM user dedicated to this connector.
3. Attach a policy that allows only the AWS actions your workflows call, scoped to the resources they manage. For example, `iam:UpdateAccessKey` and `iam:ListAccessKeys` on the IAM users a workflow may change. Do not use an administrator policy: the connector can do anything its credentials allow.
4. Create an access key for that user (**Security credentials** > **Access keys** > **Create access key**).
5. Copy the **Access key ID** and **Secret access key**, and enter them when configuring the connector in {{kib}}.
