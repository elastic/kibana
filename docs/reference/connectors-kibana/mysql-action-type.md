---
navigation_title: "MySQL"
type: reference
description: "Connect directly to a MySQL database to search and query data from Workplace AI conversations."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# MySQL connector [mysql-action-type]

The MySQL connector enables you to connect directly to a MySQL database to search and query your data from chat conversations.

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


## Test connectors [mysql-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The MySQL connector has the following actions:

Query
:   Run a read-only SQL query against the MySQL database.
    - **sql** (required): The SQL query to run.
    - **maxRows** (optional): Maximum number of rows to return (default: 100).

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
    - **columns** (required): Array of column names to search in. Use `describe_table` to discover available columns.
    - **maxRows** (optional): Maximum number of rows to return (default: 50).
    - **database** (optional): The database name. Uses the configured default if omitted.


## Requirements [mysql-requirements]

The MySQL connector connects directly to MySQL over the native MySQL protocol (default port 3306). Your MySQL server must be network-accessible from your Kibana instance.

To use the MySQL connector, you need:

1. A MySQL server accessible from your Kibana instance.
2. A MySQL user with access to the databases you want to query.
3. The server hostname, port, database name, and credentials.

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

The connector also enforces read-only access at the application level by rejecting any SQL that does not begin with a read-only keyword (`SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, or `WITH`) and by blocking multi-statement input. Using a least-privilege database user adds a second, independent layer of enforcement.

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

## Get connection details [mysql-api-credentials]

To configure the connector:

1. Identify the hostname or IP address of your MySQL server.
2. Create a MySQL user with the appropriate permissions for your use case (see [Database user permissions](#mysql-security)).
3. Note the server port (default: 3306) and the default database name.
