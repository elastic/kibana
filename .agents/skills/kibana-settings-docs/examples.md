# Examples

Copy the nearest sibling in the target file. These snippets show the usual shape only. If this setting's source defines a default, keep the `default` field even when the sibling omits it.

## New kibana.yml setting (self-managed, not on Cloud)

This setting is new in the product, so `stack` includes a version.

```yaml
      - setting: xpack.example.enabled
        id: xpack-example-enabled
        description: |
          Turns the example feature on in {{kib}}. Set to `false` to turn it off.
        datatype: bool
        default: true
        applies_to:
          stack: ga 9.5+
          ech: unavailable
          ece: unavailable
          eck: unavailable
          self: ga
          serverless: unavailable
```

## Existing setting that was missing from the docs

If the key already existed in the product before 9.0 and you are only adding the YAML, omit the version. That means all 9.0+ versions.

```yaml
      - setting: xpack.example.legacy
        description: |
          Controls the legacy example behavior.
        datatype: bool
        default: true
        applies_to:
          stack: ga
          ech: unavailable
          ece: unavailable
          eck: unavailable
          self: ga
          serverless: unavailable
```

## New kibana.yml setting available on Elastic Cloud Hosted

Set `ech: ga` if the Elastic Cloud Hosted user-settings allowlist includes the key. Set `ech: unavailable` if it does not. Then include the YAML from `elastic-cloud-kibana-settings.md` with `:deployment: ech` if that include is not already present for this file.

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
          serverless: ga
        example: |
          ```yaml
          xpack.example.mode: strict
          ```
```

## New space-level Advanced Settings entry

`setting` is the `uiSettings` key. `group` matches `category`. This setting is new and preview on Stack, so `stack` includes a version. Deployment keys stay `ga`.

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

If the ID is only on some serverless project allowlists, nest those keys. Do not write a scalar `serverless: ga`:

```yaml
      - setting: "example:searchOnly"
        id: example-search-only
        description: |
          Controls the example search-only behavior in this space.
        datatype: bool
        default: false
        applies_to:
          stack: ga 9.5+
          ech: ga
          ece: ga
          eck: ga
          self: ga
          serverless:
            elasticsearch: ga
            vectordb: ga
```

## New global Advanced Settings entry

Use `advanced-settings-global.yml`. Write `serverless: unavailable` when the setting is not available on serverless.

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
          serverless: unavailable
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
          ech: unavailable
          ece: unavailable
          eck: unavailable
          self: ga
          serverless: unavailable
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
              stack: preview
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
          serverless: ga
```

GA, then deprecated. Keep the old key. Add `deprecation_details` when the replacement is not obvious from the description:

```yaml
        applies_to:
          stack: ga 9.0-9.3, deprecated 9.4+
          ech: ga
          ece: ga
          eck: ga
          self: ga
          serverless: ga
        deprecation_details: "Use `example:newKey` instead."
```

## Removal

If the setting existed on Stack, keep the YAML entry. Do not delete it. Append `removed` and the version on `stack`. This example is the usual case: the setting leaves Stack and serverless.

```yaml
        applies_to:
          stack: ga 9.0-9.3, removed 9.4+
          ech: ga
          ece: ga
          eck: ga
          self: ga
          serverless: unavailable
        deprecation_details: "Use `example:newKey` instead."
```

If the setting existed only on serverless and is removed, delete the YAML entry. Serverless has no version history.

## Previous default in a gated note

Keep `default` as the current product value at HEAD. Put the previous value in a gated `note`. Do not list old defaults in the description, and do not omit `default`.

```yaml
        default: false
        note: |
          :applies_to: stack: ga 9.2-9.3
          In these versions, this setting defaults to `true`.
```

## Version-scoped behavior in the description

Use inline tags in the description for version-scoped behavior that is not the `default` field.

```yaml
        description: |
          Shows the example control in the editor.

          {applies_to}`stack: ga 9.5+` The control is also available in Discover.
        datatype: bool
        default: true
```

## Gated note

Put `:applies_to:` on the first line of `note`, `tip`, `warning`, or `important`. Do not add a `:::{note}` wrapper. Use this for a previous default, and for extra admonition prose such as a version-scoped caveat. Use inline `{applies_to}` in the description for other version-scoped behavior.

```yaml
        default: 500MB
        note: |
          :applies_to: stack: ga 9.0-9.3
          In these versions, this setting defaults to `100MB`.
```

```yaml
        note: |
          :applies_to: stack: ga 9.6+
          From this version, you can no longer turn the example feature on or off with this setting.
```

```yaml
        note: |
          :applies_to: serverless: ga
          In Serverless, the list can include a maximum of 50 items.
```
