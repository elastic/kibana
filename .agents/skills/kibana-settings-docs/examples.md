# Examples

Copy the nearest sibling in the target file. These snippets show the usual shape only.

## New kibana.yml setting (self-managed, not on Cloud)

```yaml
      - setting: xpack.example.enabled
        id: xpack-example-enabled
        description: |
          Enables the example feature. Set to `false` to disable it.
        datatype: bool
        default: true
        applies_to:
          stack: ga 9.5+
          self: ga
```

## New kibana.yml setting available on Elastic Cloud Hosted

Set `ech: ga` if Cloud supports the key. Confirm Cloud actually allowlists it. Then include the YAML from `elastic-cloud-kibana-settings.md` with `:deployment: ech` if that include is not already present for this file.

```yaml
      - setting: xpack.example.mode
        description: |
          Controls runtime mode.
        datatype: enum
        default: strict
        options:
          - option: strict
            description: Full validation.
          - option: lenient
            description: Reduced validation.
        applies_to:
          stack: ga 9.4+
          ech: ga
          ece: ga
          eck: ga
          self: ga
        example: |
          ```yaml
          xpack.example.mode: strict
          ```
```

## New space-level Advanced Settings entry

`setting` is the `uiSettings` key. `group` matches `category`. This example is preview on Stack. Put the version on `stack`. Deployment keys stay `ga`.

```yaml
      - setting: "example:enableFeature"
        id: example-enable-feature
        description: |
          Enables the example feature in this space. You must refresh the page to apply the setting.
        datatype: bool
        default: false
        applies_to:
          stack: preview 9.5+
          ech: ga
          ece: ga
          eck: ga
          self: ga
          serverless: ga
```

`ech: ga` is correct here even though `stack` is `preview`. Deployment keys are support flags. They are not lifecycle.

## New global Advanced Settings entry

Use `advanced-settings-global.yml`. Omit `serverless` when the setting is not available on serverless.

```yaml
      - setting: hideAnnouncements
        id: hideAnnouncements-global
        description: |
          Stops showing messages and tours that highlight new features.
        datatype: bool
        default: false
        applies_to:
          stack: ga 9.4+
          ech: ga
          ece: ga
          eck: ga
          self: ga
```

## Nested kibana.yml keys

```yaml
      - setting: xpack.example.hosts
        description: |
          List of custom host settings.
        datatype: object
        default: "[]"
        applies_to:
          stack: ga
          self: ga
        settings:
          - setting: "[n].url"
            description: |
              Host URL.
            datatype: string
          - setting: "[n].mode"
            description: |
              Validation mode for this host.
            datatype: enum
            options:
              - option: strict
              - option: lenient
            applies_to:
              stack: preview 9.5+
```

Child entries inherit parent `applies_to` unless they set their own.

## Lifecycle evolution

Append the new `stack` lifecycle. Do not replace the previous value.

Preview, then GA:

```yaml
        applies_to:
          stack: preview 9.0-9.2, ga 9.3+
          ech: ga
          ece: ga
          eck: ga
          self: ga
```

GA, then deprecated. Keep the old key. Add `deprecation_details` when the replacement is not obvious from the description:

```yaml
        applies_to:
          stack: ga 9.0-9.3, deprecated 9.4+
          ech: ga
          ece: ga
          eck: ga
          self: ga
        deprecation_details: "Use `example:newKey` instead."
```

## Removal

Keep the YAML entry. Do not delete it. Append `removed` and the version on `stack`. Keep the deployment `ga` keys.

```yaml
        applies_to:
          stack: ga 9.0-9.3, removed 9.4+
          ech: ga
          ece: ga
          eck: ga
          self: ga
        deprecation_details: "Use `example:newKey` instead."
```

## Per-version default in the description

```yaml
        description: |
          The UI theme that the {{kib}} UI should use.

          The default value depends on your version:

          * {applies_to}`stack: ga 9.5+` Defaults to `system`.
          * {applies_to}`stack: ga 9.0-9.4` Defaults to `disabled`.
        datatype: enum
        options:
          - option: enabled
          - option: disabled
          - option: system
```
