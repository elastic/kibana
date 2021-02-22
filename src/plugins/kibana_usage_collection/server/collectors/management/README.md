# User-changed UI Settings - Management Collector

The Usage Collector `stack_management` reports user changed settings.
All user changed UI Settings are automatically collected.

After adding a new setting you will be required to do the following steps:

1. Update the [schema](./schema.ts) to include the setting name and schema type.
```
export const stackManagementSchema: MakeSchemaFrom<UsageStats> = {
  'MY_UI_SETTING': { type: 'keyword' },
}
```

2. Update the [UsageStats interface](./types.ts) with the setting name and typescript type.
```
export interface UsageStats {
  'MY_UI_SETTING': string;
}
```
3. Run the telemetry checker with `--fix` flag to automatically fix the mappings

```
node scripts/telemetry_check --fix
```

If you forget any of the steps our telemetry tools and tests will help you through the process!

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
