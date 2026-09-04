# @kbn/core-overlays-browser

This package contains the public types for Core's browser-side Overlays service.

## Flyouts Services

### `overlays.openFlyout`

Opens a traditional flyout using a `MountPoint`. This method requires wrapping React content with `toMountPoint`.

```typescript
import { toMountPoint } from '@kbn/react-kibana-mount';
import { 
  EuiFlyoutHeader, 
  EuiFlyoutBody, 
  EuiFlyoutFooter,
  EuiTitle, 
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem 
} from '@elastic/eui';

// Open a flyout with a mount point
const flyoutRef = overlays.openFlyout(
  toMountPoint(
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="myFlyoutTitle">My Flyout</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>This is a flyout opened using the traditional method.</p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => flyoutRef.close()}>
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => console.log('Save')} fill>
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>,
    core
  ),
  {
    size: 'm',
    type: 'overlay',
    paddingSize: 'm',
    maxWidth: 600,
    ownFocus: true,
    outsideClickCloses: true,
    'aria-labelledby': 'myFlyoutTitle',
    onClose: (flyout) => {
      console.log('Flyout closed');
      flyout.close();
    },
  }
);

// Close the flyout programmatically
flyoutRef.close();
```

### `overlays.openFlyoutTemplate`

Opens a system flyout rendered as a `FlyoutTemplate` — the sanctioned way to build flyout content in Kibana. It takes two arguments, matching the component's own signature: the template's props, then its zones. Like `openSystemFlyout`, it integrates with the EUI Flyout Manager for session, history, and cascade-close support.

```tsx
const flyoutRef = overlays.openFlyoutTemplate(
  { size: 'm', maxWidth: 600, ownFocus: false },
  (T, flyout) => (
    <>
      <T.Header title="My Flyout" />
      <T.Body>
        <T.Body.Section title="Details">
          <p>This is a system flyout rendered as a FlyoutTemplate.</p>
        </T.Body.Section>
      </T.Body>
      <T.Footer>
        <T.Footer.SecondaryAction label="Cancel" onClick={() => flyout.close()} />
        <T.Footer.PrimaryAction label="Save" onClick={() => console.log('Save')} />
      </T.Footer>
    </>
  )
);

// Close the flyout programmatically
flyoutRef.close();
```

The callback's first argument is the `FlyoutTemplate` namespace, so declaring zones needs no import and no `kbn_references` entry for `@kbn/flyout-template`. Its second argument is the same `OverlayRef` that `open` returns, so content can close the flyout it lives in without threading a ref through.

A plain node is accepted in place of the callback for callers that import `FlyoutTemplate` themselves.

For what each zone accepts — sections, subsections, accordions, tabs, header badges/meta blocks/info blocks, footer actions — see the [`@kbn/flyout-template` README](../../../../platform/packages/shared/shared-ux/flyout/template/README.md).

#### `useFlyoutTemplate`

React callers can use the `useFlyoutTemplate` hook instead of calling `open` directly. It owns the `OverlayRef`, tracks whether the flyout is open, closes it if the component unmounts, and returns focus to a trigger element.

```tsx
const triggerRef = useRef<HTMLButtonElement>(null);
const details = useFlyoutTemplate(overlays, { returnFocusTo: triggerRef });

<EuiButton
  buttonRef={triggerRef}
  onClick={() =>
    details.open({ size: 'm' }, (T) => (
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
</EuiButton>;
```

### `overlays.openSystemFlyout` (deprecated)

> **Deprecated.** Use [`overlays.openFlyoutTemplate`](#overlaysopenflyouttemplate) instead.

### Key Differences

- **`openFlyout`**: Traditional method that requires `toMountPoint`. Opens flyouts with `session="never"`. Content should include `EuiFlyoutHeader` and `EuiFlyoutBody`. Optionally include `EuiFlyoutFooter`.
- **`openFlyoutTemplate`**: The recommended method for session-based flyouts. Opens flyouts with `session="start"` for full EUI Flyout System integration, rendered as a `FlyoutTemplate` from its props and zones — no hand-composed `EuiFlyoutHeader`/`Body`/`Footer`.