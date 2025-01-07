# YAML-based settings documentation

We're aiming to update the Kibana configuration settings pages to be based off of YAML-formatted source files. The approach has the advantages that:
 - The YAML format makes it easier to add new settings and update existing ones. The setting data is separate from almost all formatting, whether Asciidoc or (future) Markdown.
 - The HTML files will have a more consistent and user-friendly appearance.
 - The YAML format makes it easier for teams to identify missing settings or settings that are lacking details that should be made available in the docs.

The YAML settings files in the `settings-gen/source` folder are converted to Asciidoc source, located in the same directory, by means of the `parse-settings.pl` Perl script. Please do not update the generated Asciidoc files directly as your changes will be overwritten. Please make any required docs changes in the `<name>-settings.yml` files.

Following is a schema for all available properties in a YAML settings file.

## Schema

```
product: REQUIRED e.g. Elasticsearch, Kibana, Enterprise Search
collection: REQUIRED e.g. Alerting and action settings in Kibana
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
