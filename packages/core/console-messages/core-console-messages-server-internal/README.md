# @kbn/core-console-messages-server-internal

Contains configuration for the `core` `ConsoleMessages` service.

To enable the `ConsoleMessages` service, add the following to your `kibana.yml`:

```yaml
dev.consoleMessages: false | 'warn' | 'error'
```

- `false`: warnings and errors will only be displayed in the developer console.
- `warn`: warnings and errors will be displayed in the Kibana UI.
- `error`: only errors will be displayed in the Kibana UI.

The default in dev mode is `warn`.  This service will only function in dev mode.