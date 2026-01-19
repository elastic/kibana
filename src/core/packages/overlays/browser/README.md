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

### `overlays.openSystemFlyout`

Opens a system flyout that integrates with the EUI Flyout Manager. Using a mount point would break the context propogation of the EUI Flyout Manager, so this method accepts React elements directly rather than `toMountPoint`.

```typescript
import React, { useRef } from 'react';
import { 
  EuiFlyoutBody, 
  EuiFlyoutFooter,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem 
} from '@elastic/eui';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';

// Create a component or function that opens the system flyout
const openMySystemFlyout = (overlays) => {
  const flyoutRef = useRef<OverlayRef | null>(null);
  
  const handleClose = () => {
    if (flyoutRef.current) {
      flyoutRef.current.close();
    }
  };

  const FlyoutContent = () => (
    <>
      <EuiFlyoutBody>
        <EuiText>
          <p>This is a system flyout that integrates with EUI Flyout Manager.</p>
          <p>The header is automatically created from the title option.</p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={handleClose}>
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
    </>
  );

  flyoutRef.current = overlays.openSystemFlyout(<FlyoutContent />, {
    title: 'My System Flyout',
    type: 'overlay',
    size: 'm',
    maxWidth: 600,
    ownFocus: false,
    onClose: () => {
      console.log('System flyout closed');
      flyoutRef.current = null;
    },
    onActive: () => {
      console.log('System flyout became active');
    },
  });

  return flyoutRef.current;
};

// Open the flyout
const flyoutRef = openMySystemFlyout(overlays);

// Close the flyout programmatically from outside
flyoutRef.close();
```

### Key Differences

- **`openFlyout`**: Traditional method that requires `toMountPoint`. Opens flyouts with `session="never"`. Content should include `EuiFlyoutHeader` and `EuiFlyoutBody`. Optionally include `EuiFlyoutFooter`.
- **`openSystemFlyout`**: Modern method that accepts React elements directly. Opens flyouts with `session="start"` for full EUI Flyout System integration, supporting features like flyout navigation and stacking. Content should not include `EuiFlyoutHeader`, as an `EuiFlyoutMenu` is created automatically from the `title` option. Content should include `EuiFlyoutBody`, and optionally `EuiFlyoutFooter`.