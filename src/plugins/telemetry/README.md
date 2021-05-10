# Kibana Telemetry Service

Telemetry allows Kibana features to have usage tracked in the wild. The general term "telemetry" refers to multiple things:

1. Integrating with the telemetry service to express how to collect usage data (Collecting).
2. Sending a payload of usage data up to Elastic's telemetry cluster.
3. Viewing usage data in the Kibana instance of the telemetry cluster (Viewing).

This plugin is responsible for sending usage data to the telemetry cluster. For collecting usage data, use the [`usageCollection` plugin](../usage_collection/README.mdx)

## Telemetry Plugin public API

### Setup

The `setup` function exposes the following interface:

- `getTelemetryUrl: () => Promise<URL>`:
  An async function that resolves into the telemetry Url used to send telemetry. The url is wrapped with node's [URL constructor](https://nodejs.org/api/url.html). Here is an example on how to grab the url origin:
  ```
  const telemetryUrl = await getTelemetryUrl();
    > telemetryUrl.origin; // 'https://telemetry.elastic.co'
  ```
  Note that the telemetry URL is a kibana.yml configuration hence it is recommended to call the `getTelemetryUrl` everytime before using the actual url.

### Start

The `start` function exposes the following interface:

- `async getIsOptedIn(): Promise<boolean>`:
  An async function that resolves into `true` if the user has opted into send Elastic usage data.
  Resolves to `false` if the user explicitly opted out of sending usage data to Elastic or did not choose
  to opt-in or out yet after a minor or major upgrade (only when previously opted out).

### Usage

To use the exposed plugin start and setup contracts:

1. Make sure `telemetry` is in your `optionalPlugins` in the `kibana.json` file:

```json5
// <plugin>/kibana.json
{
"id": "...",
"optionalPlugins": ["telemetry"]
}
```

2. Use the exposed contracts:
```ts
// <plugin>/server/plugin.ts

import { TelemetryPluginsStart } from '../telemetry/server`;

interface MyPlyginStartDeps {
  telemetry?: TelemetryPluginsStart;
}

class MyPlugin {
  public async start(
    core: CoreStart,
    { telemetry }: MyPlyginStartDeps
  ) {
    const isOptedIn = await telemetry?.getIsOptedIn();
    ...
  }
}
```
