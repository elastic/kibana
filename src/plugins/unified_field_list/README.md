# unifiedFieldList

This Kibana plugin contains components and services for field list UI (as in fields sidebar on Discover and Lens pages).

---

## Field Stats and Field Popover Components

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

## Field List components

* `<FieldList .../>` - a top-level component to render field filters and field list sections.

* `<FieldListFilters .../>` - renders a field search input and field filters by type. Please use `useGroupedFields` hook for it. For a more direct control, see `useFieldFilters` hook.

* `<FieldListGrouped .../>` - renders a fields list which is split in sections (Special, Selected, Popular, Available, Empty, Meta fields). It accepts already grouped fields, please use `useGroupedFields` hook for it.

* `<FieldIcon type={getFieldIconType(field)} />` - renders a field icon.

```
const { isProcessing } = useExistingFieldsFetcher({ // this hook fetches fields info to understand which fields are empty.
  dataViews: [currentDataView],
  ...
});
  
const { fieldListFiltersProps, fieldListGroupedProps } = useGroupedFields({
  dataViewId: currentDataViewId, // pass `null` here for text-based queries to skip fields existence check
  allFields, // pass `null` to show loading indicators
  ...
});

// and now we can render a field list
<FieldList
  isProcessing={isProcessing}
  prepend={
    <FieldListFilters
      {...fieldListFiltersProps}
    />
  }
>
  <FieldListGrouped
    {...fieldListGroupedProps}
    renderFieldItem={renderFieldItem}
  />
</FieldList>
```

## Utils

* `getFieldIconProps(field)` - gets icon's props to use with `<FieldIcon {...getFieldIconProps(field)} />` component

* `getFieldIconType(field)` - gets icon's type for the field

* `getFieldTypeName(field)` - gets a field type label to show to the user

* `getFieldTypeDescription(field)` - gets a field type description to show to the user as help info

## Public Services

* `loadStats(...)` - returns the loaded field stats (can also work with Ad-hoc data views)

* `loadFieldExisting(...)` - returns the loaded existing fields (can also work with Ad-hoc data views)

## Hooks

* `useGroupedFields(...)` - this hook groups fields list into sections of Selected, Special, Available, Empty, Meta fields.
 
* `useFieldFilters(...)` - manages state of `FieldListFilters` component. It is included into `useGroupedFields`.

* `useQuerySubscriber(...)` - memorizes current query, filters and absolute date range which are set via UnifiedSearch.

* `useExistingFieldsFetcher(...)` - this hook is responsible for fetching fields existence info for specified data views. It can be used higher in components tree than `useExistingFieldsReader` hook.

* `useExistingFieldsReader(...)` - you can call this hook to read fields existence info which was fetched by `useExistingFieldsFetcher` hook. Using multiple "reader" hooks from different children components is supported. So you would need only one "fetcher" and as many "reader" hooks as necessary. It is included into `useGroupedFields`.

An example of using hooks for fetching and reading info whether a field is empty or not:

```
// `useQuerySubscriber` hook simplifies working with current query state which is required for `useExistingFieldsFetcher`
const querySubscriberResult = useQuerySubscriber(...);
// define a fetcher in any of your components
const { refetchFieldsExistenceInfo, isProcessing } = useExistingFieldsFetcher({
  dataViews,
  query: querySubscriberResult.query,
  filters: querySubscriberResult.filters,
  fromDate: querySubscriberResult.fromDate,
  toDate: querySubscriberResult.toDate,
  ...
});

// define a reader in any of your components on the same page to check whether a field contains data
const { hasFieldData } = useExistingFieldsReader();
const hasData = hasFieldData(currentDataViewId, fieldName) // returns a boolean
```

## Server APIs

* `/api/unified_field_list/field_stats` - returns the loaded field stats (except for Ad-hoc data views)

* `/api/unified_field_list/existing_fields/{dataViewId}` - returns the loaded existing fields (except for Ad-hoc data views)

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
