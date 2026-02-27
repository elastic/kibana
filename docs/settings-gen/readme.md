# YAML-based settings documentation

Kibana configuration settings documentation is planned to be sourced from YAML files. This is intended to improve consistency in these docs and also allow for easier contribution and maintenance.

Following is a schema for all available properties in the docs settings source file.

## Schema

```
product: REQUIRED e.g. Elasticsearch, Kibana, Enterprise Search
collection: REQUIRED e.g. Alerting and action settings in Kibana
id: REQUIRED The ID used for links to this page, e.g., general-alert-action-settings
page_description: |
  OPTIONAL
  Multiline string. Can include tables, lists, code examples, etc.

groups:
  - group: REQUIRED e.g. Preconfigured connector settings
    id: REQUIRED The ID used for documentation links, e.g., general-alert-action-settings
    # description: |
      OPTIONAL
      Multiline string. Can include tables, lists, code examples, etc.
    # example: |
      OPTIONAL
      Multiline string.
      Can include tables, lists, code examples, etc.      

    settings:
      - setting: REQUIRED e.g. xpack.encryptedSavedObjects.encryptionKey
        # id: OPTIONAL ID used for documentation links, e.g., xpack-encryptedsavedobjects-encryptionkey
        description: |
          REQUIRED
          Multiline string. Can include tables, lists, code examples, etc.
        # applies_to: MANDATORY applicability metadata
        #   Supports docs-builder applies_to syntax.
        #   Replace "ga" with the correct availability information: "preview", "beta", "ga", "deprecated", "removed", "unavailable" are accepted values
        #   Only specify a version for the "stack" key; multiple values are accepted for this key, for example "stack: preview 9.4, ga 9.5, removed 9.8"
        #
        #   applies_to:
        #     - "stack: ga 9.2"
        #     - "ess: ga"
        #     - "self: ga"
        #
        # deprecation_details: "" OPTIONAL
        # note: "" OPTIONAL
        # tip: "" OPTIONAL
        # warning: "" OPTIONAL
        # important: "" OPTIONAL
        # datatype: REQUIRED One of string/bool/int/float/enum. For enum include the supported 'options', below.
        # default: OPTIONAL
        # options:
        #   - option: OPTIONAL
        #     description: "" OPTIONAL
        # type: OPTIONAL ONe of static/dynamic
        #   - cloud
        #   - serverless
        #   - self-managed
        # settings: OPTIONAL, nested settings list
        #   Child settings inherit applies_to from the parent unless overridden.
        #   - setting: "[n].url"
        #     description: |
        #       REQUIRED
        # example: |
          OPTIONAL
          Multiline string. Can include tables, lists, code examples, etc.
```

## Example

The following example shows a fully populated document with page metadata, group metadata, nested settings, and multiple `applies_to` statements.

```yaml
---
product: Kibana
collection: Example settings collection
id: example-settings
page_description: |
  This page demonstrates the full settings documentation schema.

  Settings descriptions can include inline applies annotations, for example:
  {applies_to}`stack: ga 9.2` and {applies_to}`ess: ga`.

groups:
  - group: Example group
    id: example-group
    description: |
      These settings are examples for documentation structure and applicability tagging.
    example: |
      ```yaml
      my.parent.setting:
        child: value
      ```

    settings:
      - setting: my.parent.setting
        id: my-parent-setting
        description: |
          Parent setting with nested child settings.
        datatype: string
        default: ""
        applies_to:
          stack: ga 9.2
          ess: ga
          self: ga

        settings:
          - setting: "[n].url"
            description: |
              Child setting inheriting the parent's applicability.
            datatype: string

          - setting: "[n].serverlessOnly"
            description: |
              Child setting overriding applicability using the inline list form.
            datatype: bool
            default: false
            applies_to:
              - "serverless: ga"

      - setting: my.deprecated.setting
        description: |
          This setting is deprecated.
        datatype: bool
        default: false
        applies_to:
          - "stack: deprecated 9.3+"
          - "ess: ga"
          - "self: ga"
        deprecation_details: "Deprecated starting in 9.3."
---
```
