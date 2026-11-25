---
navigation_title: "Amazon DynamoDB"
type: reference
description: Use the Amazon DynamoDB connector to list tables, inspect table schemas, and read items with AI agents.
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Amazon DynamoDB connector [amazon-dynamodb-action-type]

The Amazon DynamoDB connector lets AI agents list tables, inspect table schemas, and read items from Amazon DynamoDB by primary key, key condition, or full scan. The connector also includes actions that write and delete items, which agents can't run.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(API only)_ are not exposed to agents, because an agent-driven write can silently overwrite or delete existing data. Until workflow support is added, you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

## Create connectors in {{kib}} [define-amazon-dynamodb-ui]

You can create connectors in **{{stack-manage-app}}** → **{{connectors-ui}}**.

### Get API credentials [amazon-dynamodb-api-credentials]

The steps to obtain credentials depend on which authentication type you choose. Both need an IAM policy that grants the permissions in [DynamoDB permissions](#amazon-dynamodb-permissions).

#### DynamoDB permissions [amazon-dynamodb-permissions]

Grant these permissions for the actions that agents can use:

- `dynamodb:ListTables`
- `dynamodb:DescribeTable`
- `dynamodb:GetItem`
- `dynamodb:Query`
- `dynamodb:Scan`

Add `dynamodb:PutItem` and `dynamodb:DeleteItem` only if you run the **Put item** and **Delete item** actions through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API. Follow the principle of least privilege: grant only the permissions required for your use case.

To restrict access to specific tables, scope the permissions to a table ARN (for example, `arn:aws:dynamodb:<region>:<account-id>:table/my-table`) instead of `*`. To query or scan a secondary index, also allow the index ARNs (for example, `arn:aws:dynamodb:<region>:<account-id>:table/my-table/index/*`). `dynamodb:ListTables` always requires `*` as the resource.

#### AWS Credentials [amazon-dynamodb-credentials-static]

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Go to **IAM** → **Users** and select or create an IAM user.
3. Attach a policy that grants the permissions in [DynamoDB permissions](#amazon-dynamodb-permissions).
4. In the IAM user's **Security credentials** tab, select **Create access key**, then select the **Application running outside AWS** use case.
5. Download the `.csv` file or copy the **Access Key ID** and **Secret Access Key** immediately. AWS shows the secret key only once.

#### AWS IAM Role [amazon-dynamodb-credentials-iam-role]

This option uses AWS STS `AssumeRole` to obtain short-lived credentials. You need two things: an IAM user whose credentials {{kib}} uses to call STS, and a role that {{kib}} assumes to access DynamoDB.

##### Set up the IAM user (base credentials)

1. Create or select an IAM user and attach a policy that allows it to assume the target role:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "sts:AssumeRole",
         "Resource": "arn:aws:iam::<account-id>:role/<role-name>"
       }
     ]
   }
   ```

2. Create an access key for this user and note the **Access Key ID** and **Secret Access Key**.

##### Set up the IAM role

1. Create an IAM role with a trust policy that allows the IAM user to assume it:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": { "AWS": "arn:aws:iam::<account-id>:user/<username>" },
         "Action": "sts:AssumeRole"
       }
     ]
   }
   ```

2. Attach a policy to the role that grants the permissions in [DynamoDB permissions](#amazon-dynamodb-permissions).
3. Note the role's **ARN**. Enter it as the **Role ARN** in the connector configuration.

### Connector configuration [amazon-dynamodb-connector-configuration]

Amazon DynamoDB connectors have the following configuration properties:

AWS Region
:   The AWS Region where your DynamoDB tables are located (for example, `us-east-1`). Each connector targets one Region. To use tables in more than one Region, create a connector for each.

Authentication type
:   The method used to authenticate with AWS. Select one of:

    - **AWS Credentials**: authenticate with a long-lived AWS Identity and Access Management (IAM) user access key and secret. Use this for simple setups where a dedicated IAM user is acceptable.
    - **AWS IAM Role**: authenticate by assuming an IAM role through AWS Security Token Service (STS). The connector still uses an IAM user access key to call STS, then signs DynamoDB requests with short-lived role credentials. Use this for cross-account access or when your security policy requires role-based access.

#### AWS Credentials fields

Access Key ID
:   The Access Key ID for the IAM user.

Secret Access Key
:   The Secret Access Key for the IAM user.

#### AWS IAM Role fields

Access Key ID
:   The Access Key ID of the IAM user whose credentials are used to call AWS STS `AssumeRole`.

Secret Access Key
:   The Secret Access Key of the IAM user.

Role ARN
:   The Amazon Resource Name (ARN) of the IAM role to assume (for example, `arn:aws:iam::123456789012:role/MyDynamoDBRole`). Roles in the standard (`aws`) partition are supported. Roles in the AWS China partition (`aws-cn`) are not.

External ID
:   (Optional) An external ID required by the role's trust policy. Needed when the role enforces a `sts:ExternalId` condition for cross-account access.

Session name
:   (Optional) A name for the assumed-role session that appears in AWS CloudTrail logs. Defaults to `kibana-connector`.

### Connector networking configuration [amazon-dynamodb-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

These settings apply to the requests to DynamoDB. They do not apply to the AWS STS `AssumeRole` request that the **AWS IAM Role** authentication type makes to the regional STS endpoint, `sts.<region>.amazonaws.com`. That request ignores the proxy, certificate, TLS, and allowed hosts settings above. It uses the proxy environment variables of the {{kib}} process (`HTTPS_PROXY` and `NO_PROXY`) if they are set, and otherwise connects directly. If your deployment needs the {{kib}} proxy or custom certificate settings to reach AWS, use **AWS Credentials** instead.

### Test connectors [amazon-dynamodb-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by calling the DynamoDB `ListTables` API for the configured region.

## Amazon DynamoDB connector actions [amazon-dynamodb-connector-actions]

The Amazon DynamoDB connector has the following actions:

List tables
:   List the names of DynamoDB tables in the configured region. Use this to discover available tables before describing or querying them.
    - **limit** (optional): Maximum number of table names to return per page (1–100, default 20).
    - **exclusiveStartTableName** (optional): Table name to start pagination from. Pass the `lastEvaluatedTableName` value from a previous response to get the next page.

Describe table
:   Retrieve the full schema and metadata for a DynamoDB table, including its primary key definition, Global Secondary Indexes (GSIs), Local Secondary Indexes (LSIs), billing mode, and item count. Use this before querying to learn what keys and indexes are available.
    - **tableName** (required): The name of the table to describe.

Get item
:   Retrieve a single item by its exact primary key. Returns `null` if no item exists with the given key.
    - **tableName** (required): The name of the table to read from.
    - **key** (required): The primary key as a map of attribute name to DynamoDB typed value (for example, `{"userId": {"S": "user-123"}}`).
    - **projectionExpression** (optional): Comma-separated list of attribute names to return.
    - **expressionAttributeNames** (optional): Map of expression attribute name placeholders (starting with `#`) to actual attribute names. Required for reserved words.

Query
:   Query a DynamoDB table or index using a key condition expression. The partition key must be specified with `=` comparison; the sort key is optional. Queries are efficient and only read items matching the key condition.
    - **tableName** (required): The name of the table to query.
    - **keyConditionExpression** (required): Key condition expression, for example `userId = :uid AND createdAt > :ts`.
    - **expressionAttributeValues** (required): Map of expression attribute value placeholders to their typed values.
    - **expressionAttributeNames** (optional): Map of expression attribute name placeholders (starting with `#`) to actual attribute names. Required for reserved words.
    - **filterExpression** (optional): Filter applied after the query before returning results.
    - **projectionExpression** (optional): Comma-separated list of attributes to return.
    - **indexName** (optional): GSI or LSI name to query instead of the table's primary key.
    - **limit** (optional): Maximum number of items to evaluate before filtering (default 100).
    - **exclusiveStartKey** (optional): Key of the first item to evaluate for pagination.
    - **scanIndexForward** (optional): `true` (default) for ascending sort key order, `false` for descending.
    - **select** (optional): `ALL_ATTRIBUTES`, `ALL_PROJECTED_ATTRIBUTES`, `SPECIFIC_ATTRIBUTES`, or `COUNT`.

Scan
:   Scan an entire DynamoDB table or index, optionally filtering results. Scan reads every item in the table and consumes significant read capacity on large tables. Use `query` instead whenever a key condition is available.
    - **tableName** (required): The name of the table to scan.
    - **filterExpression** (optional): Filter expression applied after the scan.
    - **expressionAttributeValues** (optional): Map of expression attribute value placeholders to their typed values.
    - **expressionAttributeNames** (optional): Map of expression attribute name placeholders to actual attribute names.
    - **projectionExpression** (optional): Comma-separated list of attributes to return.
    - **indexName** (optional): GSI or LSI name to scan.
    - **limit** (optional): Maximum number of items to evaluate (default 100).
    - **exclusiveStartKey** (optional): Key of the first item to evaluate for pagination.
    - **select** (optional): `ALL_ATTRIBUTES`, `ALL_PROJECTED_ATTRIBUTES`, `SPECIFIC_ATTRIBUTES`, or `COUNT`.

Put item _(API only)_
:   Write a single item to a DynamoDB table. If an item with the same primary key already exists, DynamoDB replaces it. Use `conditionExpression` to make this a conditional write.
    - **tableName** (required): The name of the table to write to.
    - **item** (required): The item as a map of attribute name to DynamoDB typed value. Must include all primary key attributes.
    - **conditionExpression** (optional): Condition that must be met for the write to succeed, for example `attribute_not_exists(userId)`.
    - **expressionAttributeValues** (optional): Map of expression attribute value placeholders for the condition.
    - **expressionAttributeNames** (optional): Map of expression attribute name placeholders for the condition.

Delete item _(API only)_
:   Delete a single item from a DynamoDB table by its primary key. The action doesn't return an error if the item doesn't exist.
    - **tableName** (required): The name of the table to delete from.
    - **key** (required): The primary key as a map of attribute name to DynamoDB typed value.
    - **conditionExpression** (optional): Condition that must be met for the delete to succeed.
    - **expressionAttributeValues** (optional): Map of expression attribute value placeholders for the condition.
    - **expressionAttributeNames** (optional): Map of expression attribute name placeholders for the condition.
