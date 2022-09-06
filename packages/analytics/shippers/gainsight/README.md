# @kbn/analytics-shippers-gainSight

gainSight implementation as a shipper for the `@kbn/analytics-client`.

## How to use it

This module is intended to be used **on the browser only**. It does not support server-side events.

```typescript
import { gainSightShipper } from "@kbn/analytics-shippers-gainsight";

analytics.registerShipper(gainSightShipper, { gainSightOrgId: '12345' })
```

