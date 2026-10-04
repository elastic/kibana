# Reproduce the gap on the Episodes page

A short manual repro that exercises the alerting_v2 Episodes page and the
RuleSummary flyout so the gap shows up.

## 1. Configure `config/kibana.dev.yml`

Enable alerting v2 and allow its work-in-progress saved-object types:

```yaml
xpack.alerting_v2.enabled: true
migrations.allowWipTypes:
  - alerting_rule
  - alerting_action_policy
  - alerting_api_key_pending_invalidation
uiSettings.globalOverrides.alerting:v2:enabled: true
```

## 2. Start Kibana

```sh
yarn start --no-base-path
```

The script targets `http://localhost:5601` by default — change `KIBANA_URL` if
your instance runs elsewhere.

## 3. Create a noisy rule

```sh
node scripts/create_alerting_v2_noisy_rule.js
```

The rule fires every 5s and transitions to active immediately, so episodes
start accumulating within seconds. Use `--group` for multiple episodes.

## 4. Open the Episodes page

Stack Management → **Alerting V2 Preview** → **Alerts**.
http://localhost:5601/app/management/alertingV2/episodes

## 5. Show all episodes

The **Status** filter is set to active by default. Change it to include every
status so closed/inactive episodes also appear in the table.

## 6. Open the RuleSummary flyout

Click the chevron on the left of any row to expand it. The RuleSummary flyout
opens with details for that episode's rule.

## 7. Observe the gap

The gap is visible in the flyout content. Compare the rendered area with what
is expected — that's the bug being reproduced.

## Clean up

```sh
node scripts/create_alerting_v2_noisy_rule.js --clean
```
