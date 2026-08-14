---
navigation_title: Logging
---

# Logging in Scout tests [scout-logging]

This page explains how logging works in Scout: the `log` fixture used inside tests, and how to inspect logs from the systems under test (Kibana, Elasticsearch, the browser, and UIAM) when running against a serverless project in MKI.

## The `log` fixture [scout-logging-fixture]

Scout exposes a worker-scoped `log` fixture backed by `ScoutLogger`, a thin wrapper around `@kbn/tooling-log`'s `ToolingLog`. Each worker gets its own logger instance tagged with a context string, and messages are written to stdout.

Use it inside a test or fixture like any other fixture:

```ts
test('does the thing', async ({ log }) => {
  log.info('starting the thing');
  log.debug('detailed state: %o', someState);
});
```

Standard levels are available: `error`, `warning`, `success`, `info`, `debug`, and `verbose`.

Scout's own services and fixtures log their setup at the `debug` level (for example, `[serviceName] loaded`), so if you want to see fixture wiring and lifecycle messages, run with `debug` (see below).

## Controlling verbosity: `SCOUT_LOG_LEVEL` [scout-logging-level]

The log level is resolved in this order:

1. An explicit `logLevel` passed when constructing the logger (rarely done outside Scout internals)
2. The `SCOUT_LOG_LEVEL` environment variable
3. The `LOG_LEVEL` environment variable
4. The default level, `info`

The value is case-insensitive, and `quiet` is normalized to `error`. Valid levels are `silent`, `error`, `warning`, `success`, `info`, `debug`, and `verbose`.

**Default locally and in CI**: `info`. There is no CI-specific override — Buildkite pipelines don't set `SCOUT_LOG_LEVEL`, so CI runs use the same `info` default as a local run unless you set the variable yourself.

To get more verbose output (for example, fixture/service lifecycle messages), run with:

```bash
SCOUT_LOG_LEVEL=debug node scripts/scout run-tests \
  --arch stateful \
  --domain classic \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

See also [Debug Scout test runs](./debugging.md) for other debugging tips.

## Inspecting serverless project logs in MKI [scout-logging-mki]

::::{note}
This section is for Elasticians only, and applies when your Scout tests run against a serverless project in MKI rather than a local stack.
::::

When a Scout test runs against a serverless project in MKI, the project's own server-side logs aren't printed to your local console — they're shipped to Elastic's internal **Overview cluster**.

**Access**: the Overview cluster is a separate organization from your personal QA cloud account, so you likely won't see the relevant data by default. Request readonly access to it (for example, via an internal access-request tool) before you can query it.

**Where to look**: in the Overview cluster's Kibana, open **Discover** and select the `discover-observability-solution-all-logs` data view (broader than the default data view — it's backed by a remote logging cluster via cross-cluster search). Filter to your test project with:

```
serverless.project.id : "<your-project-id>"
```

You can cross-check with the equivalent Kubernetes-level fields on the same documents if needed:

```
kubernetes.labels.k8s_elastic_co/project-id : "<your-project-id>"
kubernetes.namespace : "project-<your-project-id>"
```

Retention on this data view is roughly on the order of weeks for Kibana/Elasticsearch logs and longer for UIAM logs, but treat this as approximate — it's governed by ILM policies that can change, so check the actual index list if you need a precise cutoff.

### Which log types to expect [scout-logging-mki-types]

- **Kibana logs** — server-side logs from the Kibana instance backing the serverless project. Filterable by `serverless.project.id`. Useful fields: `log.level`, `log.logger`, `message`.
- **Elasticsearch logs** — server-side logs from the project's Elasticsearch cluster, same pipeline/schema as Kibana logs and filterable by `serverless.project.id`.
- **UIAM logs** — logs from the Unified Identity and Access Management service, useful when investigating auth-related test failures in serverless (where UIAM handles API keys and identity, unlike the local environment). UIAM is a shared regional service, so these logs are **not** tagged with `serverless.project.id` — correlate them to your project via a known user identity or token visible in the log `message` instead.
- **Browser logs** — console output captured during UI test runs. Locally, Scout's UI test fixtures capture browser console errors and attach them to the failure report/test artifacts when a test fails. The Overview cluster's `discover-observability-solution-all-logs` data view does not currently include raw browser/RUM application logs — only synthetic monitor results, which are a different thing.
