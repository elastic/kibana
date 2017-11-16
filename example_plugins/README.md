# Example plugins

This are temporary example plugins for the new platform.

If you want the new platform to pick up these plugins, you need to specify this
in your Kibana config:

```yaml
__newPlatform:
  plugins:
    scanDirs: ['./example_plugins']
```
