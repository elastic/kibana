---
navigation_title: "MySQL"
type: reference
description: "Connect to a MySQL database through an HTTP proxy to search and query data from Workplace AI conversations."
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/mysql-action-type.html
applies_to:
  stack: preview 9.4
  serverless: preview
---

# MySQL connector [mysql-action-type]

The MySQL connector enables you to connect to a MySQL database to search and query your data from Workplace AI conversations.

## Create connectors in {{kib}} [define-mysql-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. 

### Connector configuration [mysql-connector-configuration]

MySQL connectors have the following configuration properties:

Host
:   The hostname, IP address, or URL of the MySQL HTTP proxy (for example, `https://your-mysql-proxy.example.com`, `192.168.1.1`, `localhost`).

Port
:   The port number for the MySQL HTTP proxy (default: 8080).

Database
:   The name of the default database to query.

Bearer Token
:   An authentication token for connecting to the MySQL server.


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
    - **columns** (optional): Array of column names to search in.
    - **maxRows** (optional): Maximum number of rows to return (default: 50).
    - **database** (optional): The database name. Uses the configured default if omitted.


## Requirements [mysql-requirements]

The MySQL connector communicates with MySQL through an **HTTP proxy or gateway** that exposes a REST API in front of your database. Direct MySQL protocol (port 3306) is not supported.

To use the MySQL connector, you need:

1. An HTTP proxy or gateway that exposes your MySQL server as a REST API (for example, a custom middleware, [mysql2http](https://github.com/example/mysql2http), or a similar tool).
2. A bearer token that grants read access to the databases you want to query through the proxy.
3. The proxy must be accessible from your Kibana instance over HTTPS.

## Security and read-only enforcement [mysql-security]

The MySQL connector enforces read-only access at the application level by rejecting any SQL that does not begin with a read-only keyword (`SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, or `WITH`) and by blocking multi-statement input.

Because the connector communicates through an HTTP proxy rather than maintaining a persistent MySQL connection, it cannot set `SESSION TRANSACTION READ ONLY` directly. To add a second layer of enforcement at the database level, configure your proxy to connect to MySQL using a dedicated read-only user:

```sql
-- Create a read-only user and grant only SELECT on the target databases
CREATE USER 'kibana_readonly'@'%' IDENTIFIED BY '<password>';
GRANT SELECT ON my_database.* TO 'kibana_readonly'@'%';
FLUSH PRIVILEGES;
```

If your proxy supports session initialization hooks, you can also configure it to issue the following statement on every new connection:

```sql
SET SESSION TRANSACTION READ ONLY;
```

Using a least-privilege MySQL user is the recommended approach and provides the strongest guarantee against unintended writes.

## Get API credentials [mysql-api-credentials]

To obtain credentials:

1. Deploy or identify the HTTP proxy that wraps your MySQL server.
2. Create a dedicated read-only MySQL user and grant it `SELECT` access to the target databases (see [Security and read-only enforcement](#mysql-security)).
3. Generate or retrieve a bearer token that the proxy accepts for authentication.
4. Note the proxy host (URL, hostname, or IP), port, and the default database name.
