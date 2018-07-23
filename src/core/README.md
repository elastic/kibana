# Core

Core is a set of systems (frontend, backend etc.) that Kibana and its plugins are built on top of.

## Integration with the "legacy" Kibana

Most of the existing core functionality is still spread over "legacy" Kibana and it will take some time to upgrade it.
Kibana is still started using existing "legacy" CLI and bootstraps `core` only when needed. At the moment `core` manages
HTTP connections, handles TLS configuration and base path proxy. All requests to Kibana server will hit HTTP server 
exposed by the `core` first and it will decide whether request can be solely handled by the new platform or request should
be proxied to the "legacy" Kibana. This setup allows `core` to gradually introduce any "pre-route" processing
logic, expose new routes or replace old ones handled by the "legacy" Kibana currently.

Once config has been loaded and validated by the "legacy" Kibana it's passed to the `core` where some of its parts will 
be additionally validated so that we can make config validation stricter with the new config validation system. Even though
the new validation system provided by the `core` is also based on Joi internally it is complemented with custom rules
tailored to our needs (e.g. `byteSize`, `duration` etc.). That means that config values that are accepted by the "legacy"
Kibana may be rejected by the `core`.

One can also define new configuration keys under `__newPlatform` if these keys are supposed to be used by the `core` only
and should not be validated by the "legacy" Kibana, e.g.

```yaml
__newPlatform:
  plugins:
    scanDirs: ['./example_plugins']
```

Even though `core` has its own logging system it doesn't output log records directly (e.g. to file or terminal), but instead
forward them to the "legacy" Kibana so that they look the same as the rest of the log records throughout Kibana.
