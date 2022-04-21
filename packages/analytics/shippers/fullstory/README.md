# @kbn/analytics-shippers-fullstory

FullStory implementation as a shipper for the `@kbn/analytics-client`.

## How to use it

This module is intended to be used on the UI only. It does not support server-side events.

```typescript
import { FullStoryShipper } from "@kbn/analytics-shippers-fullstory";

analytics.registerShipper(FullStoryShipper, { fullStoryOrgId: '12345' })
```

## Configuration

|       Name       | Description | 
|:----------------:|:----------------------------------------------------------------------------------------------------------------------------------| 
| `fullStoryOrgId` | FullStory account ID                                                                                                              |
|      `host`      | The host to send the data to. Used to overcome AdBlockers by using custom DNSs. If not specified, it defaults to `fullstory.com`. |
|   `scriptUrl`    | The URL to load the FullStory client from. Falls back to `edge.fullstory.com/s/fs.js` if not specified.                           |
|     `debug`      | Whether the debug logs should be printed to the console. Defaults to `false`.                                                     |
|   `namespace`    | The name of the variable where the API is stored: `window[namespace]`. Defaults to `FS`.                                          |
