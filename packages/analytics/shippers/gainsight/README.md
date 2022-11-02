# @kbn/analytics-shippers-gainsight

Gainsight implementation as a shipper for the `@kbn/analytics-client`.

## How to use it

This module is intended to be used **on the browser only**. It does not support server-side events.

```typescript
import { GainsightShipper } from "@kbn/analytics-shippers-gainsight";

analytics.registerShipper(GainsightShipper, { gainsightOrgId: '12345' })
```

