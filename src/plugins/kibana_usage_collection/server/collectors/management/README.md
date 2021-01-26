# User-changed UI Settings - Management Collector

The Usage Collector `stack_management` reports user changed settings.
All user changed UI Settings are automatically collected.

After adding a new setting you will be required -via our usage_collection functional tests- to update the [schema](./schema.ts) of the management collector and the [UsageStats](./types.ts) interface.

If you forget our telemetry check will help you through the process! You can then run the checker with `--fix` flag to automatically fix the mappings

```
node scripts/telemetry_check --fix
```

## Sensitive fields

If the configured UI setting might contain user sensitive information simply add the property `sensitive: true` to the ui setting registration config.

```
uiSettings.register({
  [NEWS_FEED_URL_SETTING]: {
    name: i18n.translate('xpack.securitySolution.uiSettings.newsFeedUrl', {
      defaultMessage: 'News feed URL',
    }),
    value: NEWS_FEED_URL_SETTING_DEFAULT,
    sensitive: true,
    description: i18n.translate('xpack.securitySolution.uiSettings.newsFeedUrlDescription', {
      defaultMessage: '<p>News feed content will be retrieved from this URL</p>',
    }),
    category: [APP_ID],
    requiresPageReload: true,
    schema: schema.string(),
  },
}),
```

The value of any UI setting marked as `sensitive` will be reported as a keyword `[REDACTED]` instead of the actual value. This hides the actual sensitive information while giving us some intelligence over which fields the users are interactive with the most.
