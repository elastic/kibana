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

Opens a system flyout rendered as a `FlyoutTemplate` — the sanctioned way to build flyout content in Kibana. It takes the template's props, then a component that renders the template and its zones. Like `openSystemFlyout`, it integrates with the EUI Flyout Manager for session, history, and cascade-close support.

The component is a real React boundary: it may use hooks, load its own data, and re-render as that data arrives.

```tsx
const MyFlyout = ({ onClose }) => {
  const details = useDetails();

  return (
    <FlyoutTemplate onClose={onClose}>
      <FlyoutTemplate.Header title="My Flyout" />
      <FlyoutTemplate.Body>
        <FlyoutTemplate.Body.Section title="Details">
          {details ? <Details value={details} /> : <EuiSkeletonText />}
        </FlyoutTemplate.Body.Section>
      </FlyoutTemplate.Body>
      <FlyoutTemplate.Footer>
        <FlyoutTemplate.Footer.SecondaryAction label="Cancel" onClick={onClose} />
        <FlyoutTemplate.Footer.PrimaryAction label="Save" onClick={save} />
      </FlyoutTemplate.Footer>
    </FlyoutTemplate>
  );
};

const flyoutRef = overlays.openFlyoutTemplate(
  { size: 'm', maxWidth: 600, ownFocus: false },
  MyFlyout
);

// Close the flyout programmatically
flyoutRef.close();
```

**`onClose` is the only root prop the content sets**, and it arrives as a prop on the content component. It stays required so the declarative contract cannot be satisfied by a flyout nobody can dismiss. Every other root prop comes from the options argument, which is also the only place that can vary them per call — props passed to a managed `FlyoutTemplate` are ignored and warn in development. A flyout whose root props depend on its own data has to own its lifecycle and render `FlyoutTemplate` directly in a React tree.

Wrapping `onClose` to add behaviour is fine, but **declining to call it does not keep the flyout open.** The flyout manager routes the close button, history navigation, and cascade closes through that prop, and has already removed the flyout by the time any handler runs, so the template tears down either way. This also differs from `openFlyout`, where `options.onClose` replaces the close and a handler that skips `flyout.close()` does keep the flyout open. A consumer migrating a guard of that shape needs to know it cannot work here.

`useFlyoutClose` exists for content nested too deeply to receive the `onClose` prop — a button inside a `Body.Section`, say — and is not needed at the top level.

Content with nothing to load is the same shape, just without the hooks. The second argument is always a component, so nothing inside it is evaluated until the flyout mounts.

```tsx
const StaticFlyout = ({ onClose }) => (
  <FlyoutTemplate onClose={onClose}>
    <FlyoutTemplate.Header title="Static" />
    <FlyoutTemplate.Body>Nothing to load.</FlyoutTemplate.Body>
  </FlyoutTemplate>
);

overlays.openFlyoutTemplate({ size: 'm' }, StaticFlyout);
```

Callers import `FlyoutTemplate` from `@kbn/flyout-template` and need a `kbn_references` entry for it. `useFlyoutClose`, from the same package, closes the flyout from anywhere inside the content without threading the `OverlayRef` through.

For what each zone accepts — sections, subsections, accordions, tabs, header badges/meta blocks/info blocks, footer actions — see the [`@kbn/flyout-template` README](../../../../platform/packages/shared/shared-ux/flyout/template/README.md).

### `overlays.openSystemFlyout` (deprecated)

> **Deprecated.** Use [`overlays.openFlyoutTemplate`](#overlaysopenflyouttemplate) instead.

### Key Differences

- **`openFlyout`**: Traditional method that requires `toMountPoint`. Opens flyouts with `session="never"`. Content should include `EuiFlyoutHeader` and `EuiFlyoutBody`. Optionally include `EuiFlyoutFooter`.
- **`openFlyoutTemplate`**: The recommended method for session-based flyouts. Opens flyouts with `session="start"` for full EUI Flyout System integration, rendered as a `FlyoutTemplate` from its props plus a component that composes its zones — no hand-composed `EuiFlyoutHeader`/`Body`/`Footer`.