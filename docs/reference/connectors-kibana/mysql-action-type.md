---
navigation_title: "MySQL"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/mysql-action-type.html
applies_to:
  stack: preview
  serverless: preview
---

# MySQL connector [mysql-action-type]

The MySQL connector enables you to connect to a MySQL database to search and query your data from Workplace AI conversations.

## Create connectors in {{kib}} [define-mysql-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [mysql-connector-configuration]

MySQL connectors have the following configuration properties:

Host
:   The hostname or URL of the MySQL server (e.g., `https://your-mysql-server.example.com`).

Port
:   The port number for the MySQL server (default: 3306).

Database
:   The name of the default database to query.

Bearer Token
:   An authentication token for connecting to the MySQL server.


## Test connectors [mysql-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The MySQL connector has the following actions:

Query
:   Execute a read-only SQL query against the MySQL database.
    - **sql** (required): The SQL query to execute.
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


## Get API credentials [mysql-api-credentials]

To use the MySQL connector, you need to:

1. Have access to a MySQL server that exposes an HTTP API endpoint.
2. Obtain a bearer token or API token that grants read access to the databases you want to query.
3. Ensure the MySQL server is accessible from your Kibana instance.
