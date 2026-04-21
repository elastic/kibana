# Execution Identity PoC Demo

## Setup

### 1. Create a restricted index

In Dev Tools (Kibana Console):

```
PUT demo-sa-only
{
  "mappings": {
    "properties": {
      "message": { "type": "text" },
      "timestamp": { "type": "date" }
    }
  }
}

POST demo-sa-only/_doc
{
  "message": "This document is only accessible via the service account",
  "timestamp": "2026-03-29T00:00:00Z"
}
```

### 2. Create a service account

Go to **Stack Management > Security > Execution Identity** and create:

- **Name:** `demo-sa`
- **Description:** `Read access to demo-sa-only index`
- **Role descriptors:**
```json
{
  "demo_reader": {
    "index": [
      {
        "names": ["demo-sa-only"],
        "privileges": ["read"]
      }
    ]
  }
}
```

Note the name `demo-sa` -- you'll reference it in the workflow.

Alternatively, create via API:

```
POST /api/execution_identity
{
  "name": "demo-sa",
  "description": "Read access to demo-sa-only index",
  "role_descriptors": {
    "demo_reader": {
      "index": [
        {
          "names": ["demo-sa-only"],
          "privileges": ["read"]
        }
      ]
    }
  }
}
```

### 3. Create a workflow WITH the service account

```yaml
version: '1'
name: SA Demo - With Identity
description: Demonstrates execution identity - should succeed
execution_identity: demo-sa
triggers:
  - type: manual
steps:
  - id: search_restricted
    elasticsearch.search:
      index: demo-sa-only
      body:
        query:
          match_all: {}
```

Run this workflow. It should **succeed** because the `demo-sa` service account has read access to `demo-sa-only`.

### 4. Create a workflow WITHOUT the service account

```yaml
version: '1'
name: SA Demo - Without Identity
description: Demonstrates missing identity - may fail if user lacks access
triggers:
  - type: manual
steps:
  - id: search_restricted
    elasticsearch.search:
      index: demo-sa-only
      body:
        query:
          match_all: {}
```

Run this workflow as a user who does NOT have read access to `demo-sa-only`. It should **fail** with an authorization error, demonstrating that without the service account, the user's own permissions apply.

## What This Demonstrates

1. **Service accounts work**: A workflow with `execution_identity: demo-sa` executes with the SA's permissions, regardless of who triggers it.
2. **Permissions are scoped**: The SA only has read access to `demo-sa-only` -- it cannot write, and cannot access other indices.
3. **Without SA, user permissions apply**: The same workflow without `execution_identity` uses the triggering user's permissions.
4. **YAML autocomplete**: When typing `execution_identity:` in the editor, available SAs are suggested.
5. **Management UI**: SAs can be created, listed, and deleted via Stack Management.
