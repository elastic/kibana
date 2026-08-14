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

<!-- TODO(scout-team): fill in the concrete workflow for inspecting a serverless project's
     logs via the Overview cluster — which cluster/URL, how to scope to your test project,
     and which data views/index patterns to use. Confirm whether this should link an
     internal URL or stay generic in public docs. -->

When a Scout test runs against a serverless project in MKI, the project's own logs (Kibana, Elasticsearch, and related components) aren't printed to your local console — they're shipped to Elastic's internal **Overview cluster**. Elasticians can inspect them there by scoping to the test project.

*(Details on locating your project and querying its logs in the Overview cluster to follow — pending input from the Scout/QA team.)*

### Which log types to expect [scout-logging-mki-types]

<!-- TODO(scout-team): confirm dataset/index names per log type in the Overview cluster. -->

- **Kibana logs** — server-side logs from the Kibana instance backing the serverless project.
- **Elasticsearch logs** — server-side logs from the project's Elasticsearch cluster.
- **Browser logs** — console output captured during UI test runs. Locally, Scout's UI test fixtures capture browser console errors and attach them to the failure report/test artifacts when a test fails.
- **UIAM logs** — logs from the Unified Identity and Access Management service, relevant when investigating auth-related test failures in serverless (where UIAM handles API keys and identity, unlike the local environment).
