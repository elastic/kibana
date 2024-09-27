Settings YAML file schema


```
product: <Required (string) - the Elastic product name, e.g. 'Elasticsearch', 'Kibana', 'Enterprise Search', 'Elasticsearch Service', 'Elastic Cloud Enterprise'>
collection: <Required (string) - the settings page title, e.g. Alerting and action settings in Kibana>
page_description:
  - <"Optional (asciidoc) - A summary description that appears at the top of the settings page">

groups:
  - group: <Optional (string) - The title of a section within the settings page, e.g. 'General settings', 'Action settings', 'Preconfigured connector settings'>
    group_id: <Optional (string) - An ID used for links from other sections of the docs, e.g., general-alert-action-settings. The link itself would have a format like "For more information, see <<general-alert-action-settings,eneral settings>>".>
    description:
     - <Optional (asciidoc enclosed in single or double quotation marks) - The description content that appears below the group title.>
     - <Each bullet renders as a separate paragraph.>

    settings:
      - setting: <Required (string) - The setting name, e.g. xpack.encryptedSavedObjects.encryptionKey>
        description:
          - <Required (Asciidoc enclosed in single or double quotation marks) - A description of the setting>
          - <Each bullet renders as a separate paragraph.>
        state: <Optional (one of 'deprecated', 'technical-preview', or 'hidden') - For 'deprecated', use the 'state_guidance' field below if you want to provide additional detail such as the version in which the setting was deprecated and what other setting to use instead. For 'technical-preview', a standard disclaimer is added. For 'hidden', the setting won't be rendered in the docs.>
        state_guidance: <Optional (asciidoc enclosed in single or double quotation marks) - Additional detail to provide for a deprecated setting, e.g., "Starting in version 8.0.0 this setting is deprecated. Use <<action-config-custom-host-verification-mode,`xpack.actions.customHostSettings.ssl.verificationMode`>> instead."
        note: <Optional (asciidoc enclosed in single or double quotation marks) - Text to display in a special "Note:" call-out box. e.g., "Feature Name is available in Kibana 7.17.4 and 8.3.0 onwards but is not supported in Kibana 8.0, 8.1 or 8.2.">
        tip: <Optional (asciidoc enclosed in single or double quotation marks) - Text to display in a special "Tip:" call-out box.
        warning: <Optional (asciidoc enclosed in single or double quotation marks) - Text to display in a special "Warning:" call-out box,
        important: <Optional (asciidoc enclosed in single or double quotation marks) - Text to display in a special "Important:" call-out box.
        default: <Optional (string) - The default value for the setting.>
        type: <Optional (one of 'static' or 'dynamic') - Used for Elasticsearch settings only>
        options:
          - "`option-name` - description" <Optional (asciidoc enclosed in single or double quotation marks) - Text to describe the setting option.
          - "`option-name` - description" <Optional (asciidoc enclosed in single or double quotation marks) - Text to describe the setting option.
          - "`option-name` - description" <Optional (asciidoc enclosed in single or double quotation marks) - Text to describe the setting option.

        # [Required] Any of `self-managed`, `cloud', and 'serverless'. If there are any additional details, such as if the setting values are different on Cloud versus On-prem, that can be put in the setting description or the option description, above.
        platforms:
          - <Optional (one of 'self-managed', 'cloud', or 'serverless') - List each environment where the setting is available. If there are any additional details, such as if the setting values are different on Cloud versus On-prem, that can be put in the setting description or the option-name details, above.
          - <Optional (one of 'self-managed', 'cloud', or 'serverless')
          - <Optional (one of 'self-managed', 'cloud', or 'serverless')
```

