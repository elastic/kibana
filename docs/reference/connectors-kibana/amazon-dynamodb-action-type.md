---
navigation_title: "Amazon DynamoDB"
description: Use the Amazon DynamoDB connector to list tables, query, scan, and manage items in Amazon DynamoDB from Kibana workflows and AI agents.
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Amazon DynamoDB connector [amazon-dynamodb-action-type]

The Amazon DynamoDB connector enables querying, scanning, and managing items in Amazon DynamoDB tables directly from Kibana workflows and AI agents.

## Create connectors in {{kib}} [define-amazon-dynamodb-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [amazon-dynamodb-connector-configuration]

Amazon DynamoDB connectors have the following configuration properties:

AWS Access Key ID
:   The AWS Access Key ID for the IAM user with DynamoDB permissions.

AWS Secret Access Key
:   The AWS Secret Access Key for the IAM user.

AWS Region
:   The AWS Region where your DynamoDB tables are located (for example, `us-east-1`).

## Test connectors [amazon-dynamodb-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by calling the DynamoDB `ListTables` API for the configured region.

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

Query
:   Query a DynamoDB table or index using a key condition expression. The partition key must be specified with `=` comparison; the sort key is optional. Queries are efficient and only read items matching the key condition.
    - **tableName** (required): The name of the table to query.
    - **keyConditionExpression** (required): Key condition expression, for example `"userId = :uid AND createdAt > :ts"`.
    - **expressionAttributeValues** (required): Map of expression attribute value placeholders to their typed values.
    - **expressionAttributeNames** (optional): Map of expression attribute name placeholders (starting with `#`) to actual attribute names. Required for reserved words.
    - **filterExpression** (optional): Filter applied after the query before returning results.
    - **projectionExpression** (optional): Comma-separated list of attributes to return.
    - **indexName** (optional): GSI or LSI name to query instead of the table's primary key.
    - **limit** (optional): Maximum number of items to evaluate before filtering.
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
    - **limit** (optional): Maximum number of items to evaluate.
    - **exclusiveStartKey** (optional): Key of the first item to evaluate for pagination.
    - **select** (optional): `ALL_ATTRIBUTES`, `ALL_PROJECTED_ATTRIBUTES`, `SPECIFIC_ATTRIBUTES`, or `COUNT`.

Put item
:   Write a single item to a DynamoDB table. If an item with the same primary key already exists, it is fully replaced. Use `conditionExpression` to make this a conditional write.
    - **tableName** (required): The name of the table to write to.
    - **item** (required): The item as a map of attribute name to DynamoDB typed value. Must include all primary key attributes.
    - **conditionExpression** (optional): Condition that must be met for the write to succeed, for example `"attribute_not_exists(userId)"`.
    - **expressionAttributeValues** (optional): Map of expression attribute value placeholders for the condition.
    - **expressionAttributeNames** (optional): Map of expression attribute name placeholders for the condition.

Delete item
:   Delete a single item from a DynamoDB table by its primary key. No error is raised if the item did not exist.
    - **tableName** (required): The name of the table to delete from.
    - **key** (required): The primary key as a map of attribute name to DynamoDB typed value.
    - **conditionExpression** (optional): Condition that must be met for the delete to succeed.
    - **expressionAttributeValues** (optional): Map of expression attribute value placeholders for the condition.
    - **expressionAttributeNames** (optional): Map of expression attribute name placeholders for the condition.

## Get API credentials [amazon-dynamodb-api-credentials]

To use the Amazon DynamoDB connector, you need AWS credentials for an IAM user with DynamoDB permissions. Follow these steps to create credentials:

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Navigate to **IAM > Users** and select or create an IAM user.
3. Attach a policy that grants the required DynamoDB permissions. At minimum, the user needs:
   - `dynamodb:ListTables`
   - `dynamodb:DescribeTable`
   - `dynamodb:GetItem`
   - `dynamodb:Query`
   - `dynamodb:Scan`
   - `dynamodb:PutItem`
   - `dynamodb:DeleteItem`

   :::{tip}
   Follow the principle of least privilege — grant only the permissions required for your use case. Omit write permissions (`PutItem`, `DeleteItem`) if the connector will only read data.
   :::

4. In the IAM user's **Security credentials** tab, select **Create access key** and select the **Application running outside AWS** use case.
5. Download the `.csv` file or copy the **Access Key ID** and **Secret Access Key** immediately. The secret key is only shown once.
6. For the **AWS Region**, use the region where your DynamoDB tables are located (for example, `us-east-1` or `eu-west-1`).

:::{note}
DynamoDB is region-specific. Each connector instance targets a single region. Create separate connector instances for tables in different regions.
:::
