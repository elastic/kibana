# @kbn/flyout-template-overlay

React lifecycle glue for `core.overlays.openFlyoutTemplate`.

`openFlyoutTemplate` is imperative: it returns an `OverlayRef` and leaves the caller to hold it, close it at the right time, and track whether a flyout is currently open. `useFlyoutTemplate` owns all of that so a component does not have to.

```tsx
import { useFlyoutTemplate } from '@kbn/flyout-template-overlay';

const triggerRef = useRef<HTMLButtonElement>(null);
const details = useFlyoutTemplate(overlays, { returnFocusTo: triggerRef });

return (
  <EuiButton
    buttonRef={triggerRef}
    onClick={() =>
      details.open({ size: 'm', session: 'start' }, (T) => (
        <>
          <T.Header title="Alert details" />
          <T.Body>
            <AlertSummary alertId={alertId} />
          </T.Body>
        </>
      ))
    }
  >
    {details.isOpen ? 'Close details' : 'Open details'}
  </EuiButton>
);
```

The hook handles four things:

- **The ref.** `open` stores it and clears it once the flyout closes.
- **`isOpen`.** Kept in sync for every close path: the flyout's own close button, `close()`, and unmount.
- **Unmount.** A flyout open when the calling component unmounts is closed, so it cannot outlive its trigger.
- **Focus.** `returnFocusTo` is focused after the flyout closes, and skipped if the component itself has gone away.

`open` takes the same two arguments as `overlays.openFlyoutTemplate` and returns the same `OverlayRef`, so anything the service supports is available through the hook. A consumer's own `onClose` is passed through untouched — the hook tracks closes through the ref's `onClose` promise instead of wrapping the option.

Calling `open` while a flyout from the same hook is open closes the first one. Use a hook per flyout that can be open at the same time.

## Package dependencies

This package depends only on core's overlay *types*. It does not depend on `@kbn/flyout-template`; the zone components arrive as the first argument to the `children` callback, supplied by core at render time.
