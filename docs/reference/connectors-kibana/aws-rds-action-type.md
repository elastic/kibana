---
navigation_title: "AWS RDS"
type: reference
description: "Use the AWS RDS connector to query, explore schema, and run SQL against Amazon Aurora MySQL and PostgreSQL databases through the RDS Data API."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# AWS RDS connector [aws-rds-action-type]

The AWS RDS connector runs SQL against Amazon Aurora MySQL and Aurora PostgreSQL databases through the Amazon RDS Data API, so you can query data and explore schema from chat conversations.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release.
::::

## Requirements [aws-rds-requirements]

The connector reaches your database through the RDS Data API, an HTTPS endpoint, instead of a direct database connection. Your database does not need to be network-accessible from {{kib}}.

The Data API is available only for Amazon Aurora DB clusters (Aurora MySQL and Aurora PostgreSQL) that have it enabled. Other Amazon RDS engines, such as RDS for PostgreSQL, RDS for MySQL, RDS for MariaDB, and RDS for SQL Server, are not supported. The Data API runs queries on the cluster's writer instance and doesn't support burstable T-class DB instance classes.

To use the AWS RDS connector, you need:

1. An Aurora DB cluster with the RDS Data API enabled.
2. A Secrets Manager secret that contains the database username and password.
3. An AWS access key ID and secret access key for an IAM user that can call the Data API.

## Get API credentials [aws-rds-api-credentials]

To configure the connector:

1. [Enable the RDS Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.enabling.html) on your Aurora DB cluster.
2. In AWS Secrets Manager, [create a database secret](https://docs.aws.amazon.com/secretsmanager/latest/userguide/create_database_secret.html) with the credentials of a database user. Use a read-only database user unless you need writes (see [Database user permissions](#aws-rds-security)). Copy the secret's Amazon Resource Name (ARN).
3. Copy the DB cluster ARN, for example `arn:aws:rds:us-east-1:123456789012:cluster:my-cluster`.
4. Create an AWS Identity and Access Management (IAM) user and access key with the following permissions, scoped to your cluster and secret:
   - `rds-data:ExecuteStatement` on the DB cluster
   - `secretsmanager:GetSecretValue` on the secret

## Create connectors in {{kib}} [define-aws-rds-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [aws-rds-connector-configuration]

AWS RDS connectors have the following configuration properties:

AWS Region
:   The AWS Region of the Aurora cluster (for example, `us-east-1`).

DB cluster ARN
:   The ARN of the Aurora DB cluster.

Secret ARN
:   The ARN of the Secrets Manager secret that contains the database credentials.

Engine
:   The cluster's database engine: **mysql** (Aurora MySQL, the default) or **postgresql** (Aurora PostgreSQL). The connector uses this to pick the right schema discovery queries.

Database
:   The default database to run SQL in. Optional for Aurora PostgreSQL. Required for Aurora MySQL schema discovery actions unless you specify a database in each action.

Access Key ID
:   The AWS access key ID of the IAM user.

Secret Access Key
:   The AWS secret access key of the IAM user.

## Test connectors [aws-rds-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test runs `SELECT 1` through the Data API, so it fails if the credentials, the cluster ARN, or the secret are wrong.

## AWS RDS connector actions [aws-rds-connector-actions]

The AWS RDS connector has the following actions:

Query
:   Run a read-only SQL query against the database.
    - **sql** (required): The `SELECT` or `WITH` query to run. Include a `LIMIT` clause, because the Data API fails any response larger than 1 MiB. Do not include a trailing semicolon.
    - **database** (optional): The database to run in. Uses the configured default if omitted.
    - **maxRows** (optional): Maximum number of rows to return (1 to 1,000, default: 100).

List Databases
:   List the databases on the cluster.

List Tables
:   List the tables and views in a database (Aurora MySQL) or schema (Aurora PostgreSQL).
    - **database** (optional): The database name. Uses the configured default if omitted.
    - **schema** (optional): The PostgreSQL schema (default: `public`). Ignored for Aurora MySQL.

Describe Table
:   Describe a table, including column names, data types, nullability, defaults, and constraints.
    - **table** (required): The table or view name.
    - **database** (optional): The database name. Uses the configured default if omitted.
    - **schema** (optional): The PostgreSQL schema (default: `public`). Ignored for Aurora MySQL.

Get Schema
:   Retrieve the columns of every table and view in a database or schema in one call, up to 2,000 columns.
    - **database** (optional): The database name. Uses the configured default if omitted.
    - **schema** (optional): The PostgreSQL schema (default: `public`). Ignored for Aurora MySQL.

Execute SQL
:   Run any SQL statement against the database. No restrictions: `INSERT`, `UPDATE`, `DELETE`, `DROP`, and DDL are all permitted, and changes are committed automatically. Agents can call this action, so give the database user only the privileges you are willing for them to use. Prefer **Query** for read-only access.
    - **sql** (required): The SQL statement to run.
    - **database** (optional): The database to run in. Uses the configured default if omitted.

## Database user permissions [aws-rds-security]

The Data API runs every statement as the database user stored in the Secrets Manager secret, and it has no read-only mode. The permissions you grant to that user determine what the connector can do.

### Read-only chat use case (recommended)

For chat conversations, use a dedicated database user with only `SELECT` access, and store its credentials in the secret.

```sql
-- Aurora MySQL
CREATE USER 'kibana_reader'@'%' IDENTIFIED BY '<password>';
GRANT SELECT ON my_database.* TO 'kibana_reader'@'%';
```

```sql
-- Aurora PostgreSQL
CREATE ROLE kibana_reader LOGIN PASSWORD '<password>';
GRANT CONNECT ON DATABASE my_database TO kibana_reader;
GRANT USAGE ON SCHEMA public TO kibana_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kibana_reader;
```

The **Query** action enforces read-only access at the application level by accepting only `SELECT` and `WITH` statements and by blocking multi-statement input and `INTO` clauses.

::::{note}
The application-level read-only check is not a security guarantee. Prompt injection and other techniques can produce inputs that bypass it. The only reliable protection is a database user with read-only permissions.
::::

### Broader access

If your use case requires write access, grant the database user the narrowest privileges that work, for example `INSERT`, `UPDATE`, and `DELETE` on specific tables.
