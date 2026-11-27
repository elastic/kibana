---
navigation_title: "Redis"
type: reference
description: "Use the Redis connector to browse keys, read values, inspect server information, and run commands against a Redis server."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Redis connector [redis-action-type]

The Redis connector connects directly to a Redis server so you can browse keys, read values, and inspect the server from chat conversations.

::::{note}
This connector is available in **Agent Builder** only. Actions marked _(not yet available)_ are not exposed to agents, and you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

:::{include} _snippets/native-driver-memory-note.md
:::

## Requirements [redis-requirements]

The Redis connector connects directly to Redis over the native Redis protocol (default port 6379). Your server must be network-accessible from your {{kib}} instance, and connections can't be routed through a forward proxy. TLS is required by default. The connector supports a single Redis server. It doesn't support Redis Cluster, because it connects to one node and can't follow redirects to other shards.

To use the Redis connector, you need:

1. A Redis server, or a managed service that speaks the Redis protocol, reachable from your {{kib}} instance.
2. A Redis user with access to the keys you want to read (see [User permissions](#redis-security)).
3. The server hostname and port, and the user name and password.

## Get connection details [redis-api-credentials]

To configure the connector:

1. Identify the hostname or IP address and the port of the Redis server.
2. Create a Redis user with the permissions your use case needs. If your server uses a single password and no ACL users, use `default` as the user name.
3. Decide which numbered database to read. The default is `0`, and Redis Cluster is not supported.

## Create connectors in {{kib}} [define-redis-ui]

You can create connectors in **{{stack-manage-app}}** → **{{connectors-ui}}**.

### Connector configuration [redis-connector-configuration]

Redis connectors have the following configuration properties:

Host
:   The hostname or IP address of the Redis server (for example, `redis.example.com`). Wrap an IPv6 address in square brackets. Don't include a protocol prefix, port, or path.

Port
:   The port of the Redis server (default: 6379).

Database number
:   The numbered database to select after connecting (default: 0).

Username
:   The Redis user to authenticate as. Use `default` for a server that has only a password.

Password
:   The password for the Redis user.

TLS
:   Whether to encrypt the connection. **Required** (default) uses {{kib}} TLS settings. Use **Disabled** only for servers that don't offer TLS.

### Test connectors [redis-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test sends a `PING` to the server.

## Redis connector actions [redis-connector-actions]

The Redis connector has the following actions:

Server Info
:   Return server information and the number of keys in the selected database.
    - **section** (optional): The `INFO` section to return: `server` (default), `clients`, `memory`, `persistence`, `stats`, `replication`, `cpu`, `errorstats`, or `keyspace`.

List Keys
:   List key names that match a pattern, using `SCAN` so the server isn't blocked. The result includes `nextCursor` when more keys remain. Names that are empty or longer than 1024 characters aren't listed. If the key names exceed the response size limit, the action fails; use a narrower pattern or a smaller **count**.
    - **pattern** (optional): A glob-style pattern such as `user:*` (default: `*`).
    - **type** (optional): Only return keys of this type: `string`, `hash`, `list`, `set`, `zset`, or `stream`.
    - **count** (optional): The number of keys to aim for (1-1000, default: 100).
    - **cursor** (optional): The `nextCursor` from a previous call, to continue the scan.

Get Key
:   Read one key according to its type. Collections return at most **limit** elements and report `truncated` when there are more. A string over 64 KiB is cut short.
    - **key** (required): The exact key name.
    - **limit** (optional): The maximum number of elements for a hash, list, set, sorted set, or stream (1-500, default: 100).

Execute Command _(not yet available)_
:   Run any single Redis command with its arguments. No restrictions: `SET`, `DEL`, `HSET`, `FLUSHDB`, and every other command the user is allowed to run are permitted. Use only when a write or destructive operation is explicitly required. The command runs on its own connection, so a command such as `SELECT` doesn't change the database used by the other actions. Not exposed to AI agents; run it through the Run a connector API. Use **Get Key** and **List Keys** for reading.
    - **command** (required): The command name, for example `SET`.
    - **args** (optional): The command arguments, in order, each as a string.

Values are returned as UTF-8 text, so binary values appear garbled.

## User permissions [redis-security]

The permissions you grant to the Redis user determine what the connector can do. Configure them to match your intended use case.

### Read-only chat use case (recommended)

For chat conversations, where the goal is to browse and read data, use a dedicated user that can only run the read commands the connector uses, on the keys you want to expose.

```text
ACL SETUSER kibana_reader on >'<password>' ~app:* resetchannels -@all +scan +type +pttl +strlen +get +getrange +hlen +hgetall +hscan +llen +lrange +scard +smembers +sscan +zcard +zrange +xlen +xrange +info +dbsize +ping +select
```

The **Server Info**, **List Keys**, and **Get Key** actions only send commands that read data. The ACL is the reliable protection: with it, the user can't run any other command, and can't read the values of keys outside the pattern.

::::{important}
The key pattern doesn't hide key names. Redis applies key patterns to the keys named in a command, not to the names `SCAN` returns, so **List Keys** can return names outside `app:*` even though **Get Key** can't read their values. If key names must stay private, use a dedicated Redis instance for the data you want to expose.
::::

::::{note}
**Execute Command** can run any command the user is permitted to run, including destructive ones such as `FLUSHALL`. Don't grant broader permissions unless your use case requires them.
::::

### Broader access

If your use case requires write access, grant the matching commands and key patterns to the Redis user. Scope permissions as narrowly as possible.

```text
ACL SETUSER kibana_writer on >'<password>' ~app:* +@read +@write -@dangerous +ping +select +info +dbsize
```

`PING`, `SELECT`, `INFO`, and `DBSIZE` aren't part of `@read` or `@write`, but the connector needs them to test the connection, select the database, and run **Server Info**.
