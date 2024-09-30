# Saved Objects Info Svc w/ CLI

## Used via the cli

Run the cli 
> the **--esUrl** arg is required; tells the svc which elastic search endpoint to use

```shell
 λ node scripts/saved_objs_info.js --esUrl http://elastic:changeme@localhost:9220 --soTypes
```

Result

```shell
      ### types:

      [
        {
          doc_count: 5,
          key: 'canvas-workpad-template'
        },
        {
          doc_count: 1,
          key: 'apm-telemetry'
        },
        {
          doc_count: 1,
          key: 'config'
        },
        {
          doc_count: 1,
          key: 'space'
        }
      ]
```
