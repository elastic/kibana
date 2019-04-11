[Home](./index) &gt; [kibana](./kibana.md) &gt; [FlyoutRef](./kibana.flyoutref.md) &gt; [onClose](./kibana.flyoutref.onclose.md)

## FlyoutRef.onClose property

An Promise that will resolve once this flyout is closed.

Flyouts can close from user interaction, calling `close()` on the flyout reference or another call to `openFlyout()` replacing your flyout.

<b>Signature:</b>

```typescript
readonly onClose: Promise<void>;
```
