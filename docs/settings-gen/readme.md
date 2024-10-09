# YAML-based settings documentation

We're aiming to update the Kibana configuration settings pages to be based off of YAML-formatted source files. The approach has the advantages that:
 - The YAML format makes it easier to add new settings and update existing ones. The setting data is separate from almost all formatting, whether Asciidoc or (future) Markdown.
 - The HTML files will have a more consistent and user-friendly appearance.
 - The YAML format makes it easier for teams to identify missing settings or settings that are lacking details that should be made available in the docs.

The YAML settings files in the `settings-gen/source` folder are converted to Asciidoc source, located in the same directory, by means of the `parse-settings.pl` Perl script. Please do not update the generated Asciidoc files directly as your changes will be overwritten. Please make any required docs changes in the `<name>-settings.yml` files.

Following is a schema for all available properties in a YAML settings file.



## Schema with descriptions

```
product: <Required (string) - the Elastic product name, e.g. 'Elasticsearch', 'Kibana', 'Enterprise Search', 'Elasticsearch Service', 'Elastic Cloud Enterprise'>
collection: <Required (string) - the settings page title, e.g. Alerting and action settings in Kibana>
page_description:
  - <"Optional (asciidoc) - A summary description that appears at the top of the settings page">

groups:
  - group: [Optional] (string) - Section title on the settings page, e.g. Preconfigured connector settings
    id: [Optional] (string) - ID used for documentation links, e.g., general-alert-action-settings
    description:
     - [Optional] (asciidoc in quotes) - The description content that appears below the group title.
     - [Optional] (asciidoc in quotes) - Paragraph 2
     - [Optional] (asciidoc in quotes) - Paragraph 3
    example: Any complex Asciidoc such as tables, lists, code examples, etc.

    settings:
      - setting: [Required] (string) - Setting name, e.g. xpack.encryptedSavedObjects.encryptionKey
        setting_id: <Optional (string) - ID to used for documentation links, e.g., xpack-encryptedsavedobjects-encryptionkey.>
        description:
          - [Optional] (asciidoc in quotes) - The description content that appears below the group title.
          - [Optional] (asciidoc in quotes) - Paragraph 2
          - [Optional] (asciidoc in quotes) - Paragraph 3
        state: [Optional] - 'deprecated', 'technical-preview', or 'hidden'
        deprecation_details: [Optional] (asciidoc in quotes) - details about when it was deprecated and/or what setting to use instead
        note: [Optional] (asciidoc in quotes) - Text to display in a 'note' callout
        tip: [Optional] (asciidoc in quotes) - Text to display in a 'tip' callout
        warning: [Optional] (asciidoc in quotes) - Text to display in a 'warning' callout
        important: [Optional] (asciidoc in quotes) - Text to display in an 'important' callout
        default: [Optional] (string) - The setting's default value
        options:
          - option: [Optional] (string) - A setting option, e.g., zh-cn
            description: [Optional] (asciidoc in quotes) - Description of the setting option
          - option: [Optional] (string) - A setting option, e.g., ja-jp
            description: [Optional] (asciidoc in quotes) - Description of the setting option
        type: [Optional] One of 'static' or 'dynamic'
        platforms:
          - [Optional] - one of cloud/serverless/self-managed
          - [Optional] - one of cloud/serverless/self-managed
          - [Optional] - one of cloud/serverless/self-managed
        example: Any complex Asciidoc such as tables, lists, code examples, etc.
```


## Schema without descriptions (for easier cutting and pasting)

```
product: REQUIRED
collection: REQUIRED

groups:
  - group: REQUIRED
    id: REQUIRED
    # description:
    #  - ""
    # example: example-group-name.asciidoc
    settings:

      - setting: REQUIRED
        # id: 
        description:
          - "REQUIRED"
        # state: deprecated/hidden/tech-preview
        # deprecation_details: ""
        # note: ""
        # tip: ""
        # warning: ""
        # important: ""
        # default:
        # options:
        #   - option:
        #     description: ""
        # type: static/dynamic
        # platforms:
        #   - cloud/serverless/self-managed
        # example: example-{setting-name}.asciidoc
```
