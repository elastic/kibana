# unifiedFieldList

This Kibana plugin contains components and services for field list UI (as in fields sidebar on Discover and Lens pages).

---

## Components

* `<FieldListGrouped .../>` - renders a fields list which is split in sections (Selected, Special, Available, Empty, Meta fields). It accepts already grouped fields, please use `useGroupedFields` hook for it. 
 
* `<FieldStats .../>` - loads and renders stats (Top values, Distribution) for a data view field.

* `<FieldVisualizeButton .../>` - renders a button to open this field in Lens.

* `<FieldPopover .../>` - a popover container component for a field.

* `<FieldPopoverHeader .../>` - this header component included a field name and common actions.

* `<FieldPopoverVisualize .../>` - renders Visualize action in the popover footer.

These components can be combined and customized as the following:
```
<FieldPopover 
  isOpen={isOpen}
  closePopover={closePopover}
  button={<your trigger>}
  renderHeader={() => 
    <FieldPopoverHeader 
      field={field}
      closePopover={closePopover}
      onAddFieldToWorkspace={onAddFieldToWorkspace}
      onAddFilter={onAddFilter}
      onEditField={onEditField}
      onDeleteField={onDeleteField}
      ...
    />
  }
  renderContent={() => 
    <>
      <FieldStats 
        field={field}
        dataViewOrDataViewId={dataView}
        onAddFilter={onAddFilter}
        ...
      />
      <FieldPopoverVisualize
        field={field}
        datatView={dataView}
        originatingApp={'<your app name>'}
        ...
      />
    </>
  }
  ...
/>
```

## Public Services

* `loadStats(...)` - returns the loaded field stats (can also work with Ad-hoc data views)

* `loadFieldExisting(...)` - returns the loaded existing fields (can also work with Ad-hoc data views)

## Hooks

* `useExistingFieldsFetcher(...)` - this hook is responsible for fetching fields existence info for specified data views. It can be used higher in components tree than `useExistingFieldsReader` hook.

* `useExistingFieldsReader(...)` - you can call this hook to read fields existence info which was fetched by `useExistingFieldsFetcher` hook. Using multiple "reader" hooks from different children components is supported. So you would need only one "fetcher" and as many "reader" hooks as necessary.

* `useGroupedFields(...)` - this hook groups fields list into sections of Selected, Special, Available, Empty, Meta fields.

An example of using hooks together with `<FieldListGrouped .../>`:

```
const { refetchFieldsExistenceInfo, isProcessing } = useExistingFieldsFetcher({
  dataViews,
  query,
  filters,
  fromDate,
  toDate,
  ...
});
const fieldsExistenceReader = useExistingFieldsReader()
const { fieldGroups } = useGroupedFields({
  dataViewId: currentDataViewId,
  allFields,
  fieldsExistenceReader,
  ...
});

// and now we can render a field list
<FieldListGrouped
  fieldGroups={fieldGroups}
  fieldsExistenceStatus={fieldsExistenceReader.getFieldsExistenceStatus(currentDataViewId)}
  fieldsExistInIndex={!!allFields.length}
  renderFieldItem={renderFieldItem}
  screenReaderDescriptionForSearchInputId={fieldSearchDescriptionId}
/>

// or check whether a field contains data
const { hasFieldData } = useExistingFieldsReader();
const hasData = hasFieldData(currentDataViewId, fieldName) // return a boolean
```

## Server APIs

* `/api/unified_field_list/field_stats` - returns the loaded field stats (except for Ad-hoc data views)

* `/api/unified_field_list/existing_fields/{dataViewId}` - returns the loaded existing fields (except for Ad-hoc data views)

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
