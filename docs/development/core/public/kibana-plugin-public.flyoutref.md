[Home](./index) &gt; [kibana-plugin-public](./kibana-plugin-public.md) &gt; [FlyoutRef](./kibana-plugin-public.flyoutref.md)

## FlyoutRef class

A FlyoutRef is a reference to an opened flyout panel. It offers methods to close the flyout panel again. If you open a flyout panel you should make sure you call `close()` when it should be closed. Since a flyout could also be closed by a user or from another flyout being opened, you must bind to the `onClose` Promise on the FlyoutRef instance. The Promise will resolve whenever the flyout was closed at which point you should discard the FlyoutRef.

<b>Signature:</b>

```typescript
export declare class FlyoutRef 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [onClose](./kibana-plugin-public.flyoutref.onclose.md) |  | <code>Promise&lt;void&gt;</code> | An Promise that will resolve once this flyout is closed.<!-- -->Flyouts can close from user interaction, calling <code>close()</code> on the flyout reference or another call to <code>openFlyout()</code> replacing your flyout. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [close()](./kibana-plugin-public.flyoutref.close.md) |  | Closes the referenced flyout if it's still open which in turn will resolve the <code>onClose</code> Promise. If the flyout had already been closed this method does nothing. |

