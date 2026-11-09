# Advanced Settings Scout tests

Scout (Playwright) tests for the Advanced Settings plugin.

## UI tests

Specs live in `ui/tests`:

- `advanced_settings_a11y.spec.ts`
- `advanced_settings_security.spec.ts`
- `advanced_settings_spaces.spec.ts`
- `common_settings_fields.spec.ts`
- `disable_animations.spec.ts`
- `serverless_setting_validation.spec.ts`
- `settings_form.spec.ts`
- `state_store_in_session_storage.spec.ts`

Run against a persistent stateful stack:

```bash
node scripts/scout start-server --arch stateful --domain classic
node scripts/scout run-tests --arch stateful --domain classic \
  --config src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts
```

`common_settings_fields.spec.ts` and `settings_form.spec.ts` also run on serverless, and `serverless_setting_validation.spec.ts` runs only there, for example:

```bash
node scripts/scout run-tests --arch serverless --domain search \
  --config src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts
```

## API tests

Specs live in `api/tests`:

- `feature_controls.spec.ts` — asserts that Kibana feature privileges (`advancedSettings`,
  `savedObjectsManagement`) and per-space privileges allow/deny saving an advanced setting
  (`POST /internal/kibana/settings`) and telemetry opt-in (`POST /internal/telemetry/optIn`).

Run against a persistent stateful stack:

```bash
node scripts/scout start-server --arch stateful --domain classic
node scripts/scout run-tests --arch stateful --domain classic \
  --config src/platform/plugins/private/advanced_settings/test/scout/api/playwright.config.ts
```
