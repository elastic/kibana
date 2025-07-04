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
        # state: OPTIONAL One of deprecated/hidden/tech-preview
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
        # platforms: OPTIONAL, list each supported platform
        #   - cloud
        #   - serverless
        #   - self-managed
        # example: |
          OPTIONAL
          Multiline string. Can include tables, lists, code examples, etc.
```
