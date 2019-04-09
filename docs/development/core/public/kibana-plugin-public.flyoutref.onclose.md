[Home](./index) &gt; [kibana-plugin-public](./kibana-plugin-public.md) &gt; [FlyoutRef](./kibana-plugin-public.flyoutref.md) &gt; [onClose](./kibana-plugin-public.flyoutref.onclose.md)

## FlyoutRef.onClose property

An Promise that will resolve once this flyout is closed.

Flyouts can close from user interaction, calling `close()` on the flyout reference or another call to `openFlyout()` replacing your flyout.

<b>Signature:</b>

```typescript
readonly onClose: Promise<void>;
```
