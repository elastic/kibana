Settings YAML file schema



Schema with descriptions of each field

```
product: <Required (string) - the Elastic product name, e.g. 'Elasticsearch', 'Kibana', 'Enterprise Search', 'Elasticsearch Service', 'Elastic Cloud Enterprise'>
collection: <Required (string) - the settings page title, e.g. Alerting and action settings in Kibana>
page_description:
  - <"Optional (asciidoc) - A summary description that appears at the top of the settings page">

groups:
  - group: <Optional (string) - The section title on the settings page, e.g. 'General settings', 'Action settings', 'Preconfigured connector settings'>
    group_id: <Optional (string) - An ID used for links from other sections of the docs, e.g., general-alert-action-settings>
    description:
     - <Optional (asciidoc) - The description content that appears below the group title.>
     - <Optional (asciidoc) - Paragraph 2>
     - <Optional (asciidoc) - Paragraph 3, etc.>

    settings:
      - setting: <Required (string) - The setting name, e.g. xpack.encryptedSavedObjects.encryptionKey>
        setting_id: <Optional (string) - An ID to used for documentation links, e.g., xpack-encryptedsavedobjects-encryptionkey.>
        description:
          - <Required (asciidoc) - A description of the setting>
          - <Optional (asciidoc) - Paragraph 2>
          - <Optional (asciidoc) - Paragraph 3, etc.>
        state: <Optional - (one of 'deprecated', 'technical-preview', or 'hidden')>
        deprecated_guidance: <Optional (asciidoc) - detail about a deprecated setting, e.g., "Starting in version 8.0.0 this setting is deprecated. Use <<action-config-custom-host-verification-mode,`xpack.actions.customHostSettings.ssl.verificationMode`>> instead."
        note: <Optional (asciidoc) - Text to display in a "Note" call-out box. e.g., "Feature Name is available in Kibana 7.17.4 and 8.3.0 onwards but is not supported in Kibana 8.0, 8.1 or 8.2.">
        example: Any complex Asciidoc, such as a code example, table, list, image, or anything else. Add the source into the /settings-gen/examples folder and specify the filename with no path, e.g., example-xpack.actions.customHostSettings.asciidoc
        tip: <Optional (asciidoc) - Text to display in a "Tip" call-out box>
        warning: <Optional (asciidoc) - Text to display in a "Warning" call-out box>
        important: <Optional (asciidoc) - Text to display in an "Important:" call-out box>
        default: <Optional (string) - The default value for the setting.>
        options:
          - option: <Optional (string) - A setting option, e.g., zh-cn >
            description: <Optional (asciidoc) - Text to describe the setting option.>
          - option <Optional (string) - Another setting option, e.g., ja-jp >
        type: <Optional (one of 'static' or 'dynamic') - Used for Elasticsearch settings only>
        platforms:
          - <Optional (one of 'self-managed', 'cloud', or 'serverless')>
          - <Optional (one of 'self-managed', 'cloud', or 'serverless')>
          - <Optional (one of 'self-managed', 'cloud', or 'serverless')>
```


Blank schema

```
product: REQUIRED
collection: REQUIRED

groups:
  - group: REQUIRED
    id: REQUIRED
    # description:
    settings:

      - setting: REQUIRED
        # id:
        description:
          - REQUIRED
        # state:
        # deprecated_guidance:
        # example:
        # note:
        # tip:
        # warning:
        # important:
        # default:
        # options:
        # type:
        # platforms:

      - setting: REQUIRED
        # id:
        description:
          - REQUIRED
        # state:
        # deprecated_guidance:
        # example:
        # note:
        # tip:
        # warning:
        # important:
        # default:
        # options:
        # type:
        # platforms:
```
