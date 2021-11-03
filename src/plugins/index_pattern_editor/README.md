# Index pattern editor

Create index patterns from within Kibana apps. 

## How to use

You first need to add in your kibana.json the "`indexPatternEditor`" plugin as a required dependency of your plugin.

You will then receive in the start contract of the indexPatternEditor plugin the following API:

### `userPermissions.editIndexPattern(): boolean`

Convenience method that uses the `core.application.capabilities` api to determine whether the user can create or edit the index pattern. 

### `openEditor(options: IndexPatternEditorProps): CloseEditor`

Use this method to display the index pattern editor to create an index pattern.  

#### `options`

`onSave: (indexPattern: IndexPattern) => void` (**required**)

You must provide an `onSave` handler to be notified when an index pattern has been created/updated. This handler is called after the index pattern has been persisted as a saved object.

`onCancel: () => void;` (optional)

You can optionally pass an `onCancel` handler which is called when the index pattern creation flyout is closed wihtout creating an index pattern.

`defaultTypeIsRollup: boolean` (optional, default false)

The default index pattern type can be optionally specified as `rollup`.

`requireTimestampField: boolean` (optional, default false)

The editor can require a timestamp field on the index pattern.

### IndexPatternEditorComponent

This the React component interface equivalent to `openEditor`. It takes the same arguments -

```tsx
<IndexPatternEditorComponent
  onSave={...}
  onCancel={...}
  defaultTypeIsRollup={false}
  requireTimestampField={false}
/>
```
