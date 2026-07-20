---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/logging-service.html
---

# Logging service [logging-service]

Allows a plugin to provide status and diagnostic information.

::::{note}
The Logging service is only available server side.
::::

For editorial guidance on what to log and what to avoid (sensitive data, noisy `info` messages, implementation details), see the [logging guidelines](../contributing/codebase/logging.md).


```typescript
import type { PluginInitializerContext, CoreSetup, Plugin, Logger } from '@kbn/core/server';

export class MyPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    try {
      this.logger.debug('doing something...');
      // …
    } catch (e) {
      this.logger.error('failed doing something...');
    }
  }
}
```

## Usage [_usage_2]

Usage is very straightforward, one should just get a logger for a specific context and use it to log messages with different log level.

```typescript
const logger = kibana.logger.get('server');

logger.trace('Message with `trace` log level.');
logger.debug('Message with `debug` log level.');
logger.info('Message with `info` log level.');
logger.warn('Message with `warn` log level.');
logger.error('Message with `error` log level.');
logger.fatal('Message with `fatal` log level.');

const loggerWithNestedContext = kibana.logger.get('server', 'http');
loggerWithNestedContext.trace('Message with `trace` log level.');
loggerWithNestedContext.debug('Message with `debug` log level.');
```

And assuming logger for `server` name with `console` appender and `trace` level was used, console output will look like this:

```bash
[2017-07-25T11:54:41.639-07:00][TRACE][server] Message with `trace` log level.
[2017-07-25T11:54:41.639-07:00][DEBUG][server] Message with `debug` log level.
[2017-07-25T11:54:41.639-07:00][INFO ][server] Message with `info` log level.
[2017-07-25T11:54:41.639-07:00][WARN ][server] Message with `warn` log level.
[2017-07-25T11:54:41.639-07:00][ERROR][server] Message with `error` log level.
[2017-07-25T11:54:41.639-07:00][FATAL][server] Message with `fatal` log level.

[2017-07-25T11:54:41.639-07:00][TRACE][server.http] Message with `trace` log level.
[2017-07-25T11:54:41.639-07:00][DEBUG][server.http] Message with `debug` log level.
```

The log will be less verbose with `warn` level for the `server` logger:

```bash
[2017-07-25T11:54:41.639-07:00][WARN ][server] Message with `warn` log level.
[2017-07-25T11:54:41.639-07:00][ERROR][server] Message with `error` log level.
[2017-07-25T11:54:41.639-07:00][FATAL][server] Message with `fatal` log level.
```

## Structured meta for operators [logging-structured-meta]

Pass ECS-compatible `LogMeta` as the second argument so operators can raise verbosity for a subset of traffic with [meta filters](/reference/configuration-reference/logging-settings.md) in `kibana.yml`, without enabling debug for the whole logger.

Put stable entity identifiers under `labels.*`. Keep `tags` for categorical markers (event class), not IDs:

```typescript
logger.debug('Rule execution finished', {
  labels: {
    ruleType: 'esql',
    ruleId: rule.id,
    spaceId: spaceId,
  },
  tags: ['rule-run'],
});
```

Operators can then target that traffic:

```yaml
logging:
  loggers:
    - name: plugins.myPlugin
      level: warn
      filters:
        - type: meta
          match:
            labels.ruleType: esql
          level: debug
```

Guidelines:

- Prefer nested `labels` objects (`{ labels: { ruleType: 'esql' } }`) so filter paths like `labels.ruleType` match. Flat keys (`{ 'labels.ruleType': 'esql' }`) also work, but pick one shape and use it consistently.
- Matching is strict equality — do not mix string and number types for the same field.
- Do not put secrets or PII in meta fields that filters may reference; filtered records still reach appenders with their full meta.
- `logger.isLevelEnabled('debug')` ignores meta filters. If you gate expensive message construction, pass a message function (`logger.debug(() => expensive(), meta)`) or always pass meta on the call so the filter can decide.

For editorial guidance on what belongs in meta, see the [logging guidelines](../contributing/codebase/logging.md#structured-meta-and-filters).


