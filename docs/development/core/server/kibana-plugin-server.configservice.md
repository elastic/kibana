[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [ConfigService](./kibana-plugin-server.configservice.md)

## ConfigService class


<b>Signature:</b>

```typescript
export declare class ConfigService 
```

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [atPath(path, ConfigClass)](./kibana-plugin-server.configservice.atpath.md) |  | Reads the subset of the config at the specified <code>path</code> and validates it against the static <code>schema</code> on the given <code>ConfigClass</code>. |
|  [getConfig$()](./kibana-plugin-server.configservice.getconfig$.md) |  | Returns the full config object observable. This is not intended for "normal use", but for features that \_need\_ access to the full object. |
|  [getUnusedPaths()](./kibana-plugin-server.configservice.getunusedpaths.md) |  |  |
|  [getUsedPaths()](./kibana-plugin-server.configservice.getusedpaths.md) |  |  |
|  [isEnabledAtPath(path)](./kibana-plugin-server.configservice.isenabledatpath.md) |  |  |
|  [optionalAtPath(path, ConfigClass)](./kibana-plugin-server.configservice.optionalatpath.md) |  | Same as <code>atPath</code>, but returns <code>undefined</code> if there is no config at the specified path.[ConfigService.atPath()](./kibana-plugin-server.configservice.atpath.md) |

