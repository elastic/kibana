# @kbn/analytics-shippers-elastic-v3-server

Server-side implementation of the Elastic V3 shipper for the `@kbn/analytics-client`.

## How to use it

This module is intended to be used **on the server-side only**. It is specially designed to apply the necessary backpressure mechanisms to prevent the server from getting overloaded with too many events and identify if the server sits behind a firewall to discard any incoming events. Refer to `@kbn/analytics-shippers-elastic-v3-browser` for the browser-side implementation.

```typescript
import { ElasticV3ServerShipper } from "@kbn/analytics-shippers-elastic-v3-server";

analytics.registerShipper(ElasticV3ServerShipper, { channelName: 'myChannel', version: '1.0.0' });
```

## Configuration

|     Name      | Description                                                                                | 
|:-------------:|:-------------------------------------------------------------------------------------------| 
| `channelName` | The name of the channel to send the events.                                                |
|   `version`   | The version of the application generating the events.                                      |
|    `debug`    | When `true`, it logs the responses from the remote Telemetry Service. Defaults to `false`. |

## Transmission protocol

This shipper sends the events to the Elastic Internal Telemetry Service. It holds up to 1000 events in a shared queue. Any additional incoming events once it's full will be dropped. It sends the events from the queue in batches of up to 10kB every 10 seconds. When shutting down, it'll send all the remaining events in the queue.
