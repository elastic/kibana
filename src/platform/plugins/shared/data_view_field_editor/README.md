# Data view field editor

The reusable field editor across Kibana!   

This editor can be used to

* create or edit a runtime field inside a data view.  
* edit concrete (mapped) fields. In this case certain functionalities will be disabled like the possibility to change the field _type_ or to set the field _value_.

## How to use

You first need to add in your kibana.json the "`dataViewFieldEditor`" plugin as a required dependency of your plugin.

You will then receive in the start contract of the dataViewFieldEditor plugin the following API:

### `userPermissions.editDataView(): boolean`

Convenience method that uses the `core.application.capabilities` api to determine whether the user can edit the data view. 

### `openEditor(options: OpenFieldEditorOptions): CloseEditor`

Use this method to open the data view field editor to either create (runtime) or edit (concrete | runtime) a field.  

#### `options`

`ctx: FieldEditorContext` (**required**)

This is the only required option. You need to provide the context in which the editor is being consumed. This object has the following properties:

- `dataView: DataView`: the data view you want to create/edit the field into.

`onSave(field: DataViewField): void` (optional)

You can provide an optional `onSave` handler to be notified when the field has being created/updated. This handler is called after the field has been persisted to the saved object.

`fieldName: string` (optional)

You can optionally pass the name of a field to edit. Leave empty to create a new runtime field based field.

### `openDeleteModal(options: OpenFieldDeleteModalOptions): CloseEditor`

Use this method to open a confirmation modal to delete runtime fields from a data view.  

#### `options`

`ctx: FieldEditorContext` (**required**)

You need to provide the context in which the deletion modal is being consumed. This object has the following properties:

- `dataView: DataView`: the index pattern you want to delete fields from.

`onDelete(fieldNames: string[]): void` (optional)

You can provide an optional `onDelete` handler to be notified when the fields have been deleted. This handler is called after the deletion has been persisted to the saved object.

`fieldName: string | string[]` (**required**)

You have to pass the field or fields to delete.

### `<DeleteRuntimeFieldProvider />`

This children func React component provides a handler to delete one or multiple runtime fields. It can be used as an alternative to `openDeleteModal` in a react context.

#### Props

* `dataView: DataView`: the current dataView. (**required**)

```js

const { DeleteRuntimeFieldProvider } = dataViewFieldEditor;

// Single field
<DeleteRuntimeFieldProvider dataView={dataView}>
  {(deleteField) => (
    <EuiButton fill color="danger" onClick={() => deleteField('myField')}>
      Delete
    </EuiButton>
  )}
</DeleteRuntimeFieldProvider>

// Multiple fields
<DeleteRuntimeFieldProvider dataView={dataView}>
  {(deleteFields) => (
    <EuiButton fill color="danger" onClick={() => deleteFields(['field1', 'field2', 'field3'])}>
      Delete
    </EuiButton>
  )}
</DeleteRuntimeFieldProvider>
```
