# Index pattern field editor

The reusable field editor across Kibana!   

This editor can be used to

* create or edit a runtime field inside an index pattern.  
* edit concrete (mapped) fields. In this case certain functionalities will be disabled like the possibility to change the field _type_ or to set the field _value_.

## How to use

You first need to add in your kibana.json the "`indexPatternFieldEditor`" plugin as a required dependency of your plugin.

You will then receive in the start contract of the indexPatternFieldEditor plugin the following API:

### `openEditor(options: OpenFieldEditorOptions): CloseEditor`

Use this method to open the index pattern field editor to either create (runtime) or edit (concrete | runtime) a field.  

#### `options`

`ctx: FieldEditorContext` (**required**)

This is the only required option. You need to provide the context in which the editor is being consumed. This object has the following properties:

- `indexPattern: IndexPattern`: the index pattern you want to create/edit the field into.

`onSave(field: IndexPatternField): void` (optional)

You can provide an optional `onSave` handler to be notified when the field has being created/updated. This handler is called after the field has been persisted to the saved object.

`fieldName: string` (optional)

You can optionally pass the name of a field to edit. Leave empty to create a new runtime field based field.

### `userPermissions.editIndexPattern(): boolean`

Convenience method that uses the `core.application.capabilities` api to determine whether the user can edit the index pattern. 

### `<DeleteRuntimeFieldProvider />`

This children func React component provides a handler to delete one or multiple runtime fields.

#### Props

* `indexPattern: IndexPattern`: the current index pattern. (**required**)

```js

const { DeleteRuntimeFieldProvider } = indexPatternFieldEditor;

// Single field
<DeleteRuntimeFieldProvider indexPattern={indexPattern}>
  {(deleteField) => (
    <EuiButton fill color="danger" onClick={() => deleteField('myField')}>
      Delete
    </EuiButton>
  )}
</DeleteRuntimeFieldProvider>

// Multiple fields
<DeleteRuntimeFieldProvider indexPattern={indexPattern}>
  {(deleteFields) => (
    <EuiButton fill color="danger" onClick={() => deleteFields(['field1', 'field2', 'field3'])}>
      Delete
    </EuiButton>
  )}
</DeleteRuntimeFieldProvider>
```
