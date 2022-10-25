# @kbn/subscription-tracking

This package leverages the `@kbn/analytics-client` package to send dedicated subscription tracking events.

It provides a set of React components that automatically track `impression` and `click` events. Consumers of those components need to specify a `subscription context` that gives more details on the type of feature that is advertised and the location of the upsell.

```typescript
import { SubscriptionLink } from '@kbn/subscription-tracking';
import type { SubscriptionContext } from '@kbn/subscription-tracking';

const subscriptionContext: SubscriptionContext = {
  feature: 'threat-intelligence',
  source: 'security__threat-intelligence',
};

export const Paywall = () => {
  return (
    <div>
      <SubscriptionLink subscriptionContext={subscriptionContext}>
        Upgrade to Platinum to get this feature
      </SubscriptionLink>
    </div>
  )
}
```

The example above uses a `SubscriptionLink` which is a wrapper of `EuiLink` . So it behaves just like a normal link. Alternatively, upsells can also use a `SubscriptionButton` or `SubscriptionButtonEmpty` which wrap `EuiButton` and `EuiButtonEmpty` respectively.

When the link is mounted, it will send off an `impression` event with the given `subscriptionContext`. That piece of metadata consists of an identifier of the advertised feature (in this case `threat-intelligence`) and the `source` (aka location) of the impression (in this case the `threat-intelligence` page in the `security` solution). `source` follows the following format: `{solution-identifier}__location-identifier`.

There are no special rules for how to name these identifiers but it's good practise to make sure that `feature` has the same value for all upsells advertising the same feature (e.g. use enums for features to prevent spelling mistakes).

Upon interaction with the upsell link/button, a special `click` event is sent, which, again, contains the same subscription context.

If you want to use the `subscription-tracking` elements in your app, you have to set up a `SubscriptionTrackingProvider` in your plugin setup and register the tracking events on startup. Have a look at https://github.com/elastic/kibana/pull/143910 for an example of an integration.
