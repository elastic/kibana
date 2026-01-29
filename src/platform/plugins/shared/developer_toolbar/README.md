## Developer Toolbar Plugin

Plugin that enables the developer toolbar in Kibana **development mode only**. Other plugins can register custom items in the toolbar using the plugin contract.

For detailed information about the toolbar itself, features, and capabilities, see [`@kbn/developer-toolbar`](../../../packages/shared/kbn-developer-toolbar/README.md).

## Usage

Register custom items in the developer toolbar via the plugin contract:

```tsx
export class MyPlugin implements Plugin {
  public setup(core: CoreSetup, plugins: { developerToolbar: DeveloperToolbarSetup }) {
    plugins.developerToolbar?.registerItem({
      id: 'my-debug-tool',
      priority: 10,
      children: <MyDebugButton />,
    });
  }
}
```

## Plugin Contract

### `registerItem(item: DeveloperToolbarItemProps): UnregisterItemFn`

Registers a custom item to appear in the developer toolbar.

**Parameters:**

- `id` (string): Unique identifier for the item
- `children` (React component): Content to render in the toolbar
- `priority` (number, optional): Order in toolbar (higher = first, default: 0)

**Returns:**

- Function to unregister the item

**Available in:** Setup and Start phases
