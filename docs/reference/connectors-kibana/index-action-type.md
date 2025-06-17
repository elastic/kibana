---
navigation_title: "Index"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/index-action-type.html
applies_to:
  stack: all
  serverless: all
---

# Index connector and action [index-action-type]

An index connector indexes a document into {{es}}.

## Create connectors in {{kib}} [define-index-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}** or as needed when you're creating a rule. For example:

:::{image} ../images/index-connector.png
:alt: Index connector
:screenshot:
:::

### Connector configuration [index-connector-configuration]

Index connectors must have a name and an {{es}} index.
You can optionally choose a field that indicates when the document was indexed.

## Test connectors [index-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.
For example:

:::{image} ../images/index-params-test.png
:alt: Index params test
:screenshot:
:::

Index connector actions contain a document in JSON format. For example, if you have an index with the following properties:

```text
PUT test
{
    "settings" : {
        "number_of_shards" : 1
    },
    "mappings" : {
        "properties" : {
            "rule_id" : { "type" : "text" },
            "rule_name" : { "type" : "text" },
            "alert_id" : { "type" : "text" },
            "context_message": { "type" : "text" }
        }
    }
}
```

Your test document could contain the following properties and variables:

```text
{
    "rule_id": "{{rule.id}}",
    "rule_name": "{{rule.name}}",
    "alert_id": "{{alert.id}}",
    "context_message": "{{context.message}}"
}
```
