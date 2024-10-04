Settings YAML file schema



Schema with descriptions

```
product: <Required (string) - the Elastic product name, e.g. 'Elasticsearch', 'Kibana', 'Enterprise Search', 'Elasticsearch Service', 'Elastic Cloud Enterprise'>
collection: <Required (string) - the settings page title, e.g. Alerting and action settings in Kibana>
page_description:
  - <"Optional (asciidoc) - A summary description that appears at the top of the settings page">

groups:
  - group: [Optional] (string) - Section title on the settings page, e.g. Preconfigured connector settings
    group_id: [Optional] (string) - ID used for documentation links, e.g., general-alert-action-settings
    description:
     - [Optional] (asciidoc in quotes) - The description content that appears below the group title.
     - [Optional] (asciidoc in quotes) - Paragraph 2
     - [Optional] (asciidoc in quotes) - Paragraph 3

    settings:
      - setting: [Required] (string) - Setting name, e.g. xpack.encryptedSavedObjects.encryptionKey
        setting_id: <Optional (string) - ID to used for documentation links, e.g., xpack-encryptedsavedobjects-encryptionkey.>
        description:
          - [Optional] (asciidoc in quotes) - The description content that appears below the group title.
          - [Optional] (asciidoc in quotes) - Paragraph 2
          - [Optional] (asciidoc in quotes) - Paragraph 3
        state: [Optional] - 'deprecated', 'technical-preview', or 'hidden'
        deprecation_details: [Optional] (asciidoc in quotes) - details about when it was deprecated and/or what setting to use instead

        intro: Any complex Asciidoc such as tables, lists, code examples, etc.
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
          - [Optional] - one of 'self-managed', 'cloud', or 'serverless'
          - [Optional] - one of 'self-managed', 'cloud', or 'serverless'
          - [Optional] - one of 'self-managed', 'cloud', or 'serverless'
        example: Any complex Asciidoc such as tables, lists, code examples, etc.
```


Blank schema

```
product: REQUIRED
collection: REQUIRED

groups:
  - group: REQUIRED
    id: REQUIRED
    # description: ""
    settings:

      - setting: REQUIRED
        # id: 
        description:
          - "REQUIRED"
        # state:
        # deprecation_details: ""
        # intro: intro.asciidoc
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
        #   - platform:
        # example: example.asciidoc
```
