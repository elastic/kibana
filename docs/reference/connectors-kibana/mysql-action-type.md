---
navigation_title: "MySQL"
type: reference
description: "Use the MySQL connector to query, explore schema, and execute SQL against a MySQL database."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# MySQL connector [mysql-action-type]

The MySQL connector connects directly to a MySQL database so you can search, query, and explore schema from chat conversations. Workflow authors can also run write or DDL statements through **Execute SQL**.

## Requirements [mysql-requirements]

The MySQL connector connects directly to MySQL over the native MySQL protocol (default port 3306). Your MySQL server must be network-accessible from your Kibana instance. TLS is required by default.

To use the MySQL connector, you need:

1. A MySQL server accessible from your Kibana instance.
2. A MySQL user with access to the databases you want to query.
3. The server hostname, port, database name, and credentials.

## Get connection details [mysql-api-credentials]

To configure the connector:

1. Identify the hostname or IP address of your MySQL server.
2. Create a MySQL user with the appropriate permissions for your use case (see [Database user permissions](#mysql-security)).
3. Note the server port (default: 3306) and the default database name.

## Create connectors in {{kib}} [define-mysql-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [mysql-connector-configuration]

MySQL connectors have the following configuration properties:

Host
:   The hostname or IP address of the MySQL server (for example, `mysql.example.com`, `192.168.1.1`, `localhost`). Do not include a protocol prefix.

Port
:   The port number of the MySQL server (default: 3306).

Database
:   The name of the default database to query.

Username
:   The MySQL user to authenticate as.

Password
:   The password for the MySQL user.

TLS
:   Whether to encrypt the connection. **Required** (default) uses Kibana TLS settings. **Disabled** is only for servers that do not support TLS.


## Test connectors [mysql-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

## MySQL Connector actions [mysql-connector-actions]

The MySQL connector has the following actions:

Query
:   Run a read-only SQL query against the MySQL database.
    - **sql** (required): The SQL query to run. Include a `LIMIT` clause to bound the result size. Do not include a trailing semicolon.

List Databases
:   List all databases accessible to the authenticated user.

List Tables
:   List all tables in a database.
    - **database** (optional): The database name. Uses the configured default if omitted.

Describe Table
:   Describe the schema of a table, including column names, types, and constraints.
    - **table** (required): The table name to describe.
    - **database** (optional): The database name. Uses the configured default if omitted.

Search Rows
:   Search rows in a table by matching a search term against specified columns.
    - **table** (required): The table to search.
    - **searchTerm** (required): The text to search for.
    - **columns** (required): Array of column names to search in. Use `describeTable` to discover available columns.
    - **maxRows** (optional): Maximum number of rows to return (1-1000, default: 100).
    - **database** (optional): The database name. Uses the configured default if omitted.

Execute SQL
:   Run any SQL statement against the MySQL database. No restrictions — `INSERT`, `UPDATE`, `DELETE`, `DROP`, and DDL are all permitted. Use only when the workflow explicitly requires a write or destructive operation. Prefer **Query** for read-only access.
    - **sql** (required): The SQL statement to execute.


## Database user permissions [mysql-security]

The permissions you grant to the MySQL user determine what the connector can do. Configure them to match your intended use case.

### Read-only chat use case (recommended)

For chat conversations, where the goal is to query and explore data, use a dedicated user with only `SELECT` access. This is the recommended configuration and provides the strongest protection against unintended modifications.

```sql
-- Create a read-only user and grant SELECT on the target databases
CREATE USER 'kibana_reader'@'%' IDENTIFIED BY '<password>';
GRANT SELECT ON my_database.* TO 'kibana_reader'@'%';
FLUSH PRIVILEGES;
```

The `query` action enforces read-only access at the application level by accepting only `SELECT` and `WITH` statements and by blocking multi-statement input. Use **List Tables** and **Describe Table** for schema discovery.

::::{note}
The application-level read-only check is not a security guarantee. Prompt injection and other techniques may craft inputs that bypass it. The only reliable protection is granting the database user read-only permissions. Application-level enforcement is a defense-in-depth measure, not a substitute for least-privilege credentials.
::::

Using a least-privilege database user adds a second, independent layer of enforcement. Note: the `executeSql` action bypasses these restrictions and can run any statement — do not grant write privileges unless your use case requires them.

You can further restrict the user to connections from your Kibana host's IP address:

```sql
CREATE USER 'kibana_reader'@'<kibana-host-ip>' IDENTIFIED BY '<password>';
```

### Broader access

If your use case requires write access or access across multiple databases, grant the appropriate privileges to the MySQL user. Scope permissions as narrowly as possible for your use case.

```sql
-- Example: grant read/write access to a specific database
GRANT SELECT, INSERT, UPDATE, DELETE ON my_database.* TO 'kibana_user'@'%';
FLUSH PRIVILEGES;
```
