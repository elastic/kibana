Settings YAML file schema


```

# [Required] An Elastic product name: 'Elasticsearch', 'Kibana', 'Enterprise Search', 'Elasticsearch Service', 'Elastic Cloud Enterprise'
product: Kibana

# [Required] This will be the settings page title
collection: Alerting and action settings in Kibana

groups:
    # [Optional] The title of the sections that divide up a single settings page. Examples: 'General settings', 'Action settings', 'Preconfigured connector settings'
  - group: General settings

    # [Optional] Links from other places in the documentation can use this ID. For example, "For more information, see [General settings](./general-alert-action-settings)"
    group_id: general-alert-action-settings

    # [Optional] Markdown format wrapped in single or double quotation marks. This becomes the description content below the group title. Each bullet renders as a separate paragraph.
    description:
     - "Something"
     - "Something else."

    settings:

        # [Required] The setting name.
      - setting: xpack.encryptedSavedObjects.encryptionKey 

        # [Required] Markdown format wrapped in single or double quotation marks. This becomes the description content below the setting. Each bullet renders as a separate paragraph.
        description:
          - "A string of 32 or more characters used to encrypt sensitive properties on alerting rules and actions before they're stored in {es}. Third party credentials &mdash; such as the username and password used to connect to an SMTP service &mdash; are an example of encrypted properties."
          - "{kib} offers a <<kibana-encryption-keys, CLI tool>> to help generate this encryption key."
          - "If not set, {kib} will generate a random key on startup, but all alerting and action functions will be blocked. Generated keys are not allowed for alerting and actions because when a new key is generated on restart, existing encrypted data becomes inaccessible. For the same reason, alerting and actions in high-availability deployments of {kib} will behave unexpectedly if the key isn't the same on all instances of {kib}."
          - "Although the key can be specified in clear text in `kibana.yml`, it's recommended to store this key securely in the <<secure-settings,{kib} Keystore>>. Be sure to back up the encryption key value somewhere safe, as your alerting rules and actions will cease to function due to decryption failures should you lose it.  If you want to rotate the encryption key, be sure to follow the instructions on <<encryption-key-rotation, encryption key rotation>>."
        
        # [Optional] Markdown format wrapped in single or double quotation marks. This would typically be 'Deprecated' or 'Technical Preview'. The state will appear directly below the setting name.
        # For a beta release, 'state' can be set to "Technical Preview" and 'state_guidance' to "This functionality is in technical preview and may be changed or removed in a future release. Elastic will apply best effort to fix any issues, but features in technical preview are not subject to the support SLA of official GA features."
        state: Deprecated
        state_guidance: "Starting in version 8.0.0 this setting is deprecated. Use <<action-config-custom-host-verification-mode,`xpack.actions.customHostSettings.ssl.verificationMode`>> instead."

        [Optional] Markdown format wrapped in single or double quotation marks. Can be one of 'note:', 'warning:', 'tip:', 'important:'. The warning, note, or whichever will appear below the last paragraph of the setting description.
        warning: "This feature is available in Kibana 7.17.4 and 8.3.0 onwards but is not supported in Kibana 8.0, 8.1 or 8.2."

        # [Optional] The default value for the setting.
        default: true

        # [Required only for Elasticsearch settings] One of 'dynamic', 'static'.
        type: static

        # [Optional] Markdown format wrapped in single or double quotation marks. Format is "`option` - description of the option"
        options:
          - "`yes` - a description"
          - "`no` - a different description"
          - "`maybe`- yet another description"

        # [Required] Any of `self-managed`, `cloud', and 'serverless'. If there are any additional details, such as if the setting values are different on Cloud versus On-prem, that can be put in the setting description or the option description, above.
        platforms:
          - self-managed
```



