# @kbn/ebt/shippers/fullstory

FullStory implementation as a shipper for the `@kbn/ebt/client`.

## How to use it

This module is intended to be used **on the browser only**. It does not support server-side events.

```typescript
import { FullStoryShipper } from "@kbn/ebt/shippers/fullstory";

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

## FullStory Custom Events Rate Limits

FullStory limits the number of custom events that can be sent per second ([docs](https://help.fullstory.com/hc/en-us/articles/360020623234#custom-property-rate-limiting)). In order to comply with that limit, this shipper will only emit the event types registered in the allow-list defined in the constant [CUSTOM_EVENT_TYPES_ALLOWLIST](./src/fullstory_shipper.ts). We may change this behaviour in the future to a remotely-controlled list of events or rely on the opt-in _cherry-pick_ config mechanism of the Analytics Client.

## Transmission protocol

This shipper relies on FullStory official snippet. The internals about how it transfers the data are not documented.
