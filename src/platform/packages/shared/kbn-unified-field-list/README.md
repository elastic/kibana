# @kbn/unified-field-list

This Kibana package contains components and services for field list UI (as in fields sidebar on Discover and Lens pages).

## UnifiedFieldListSidebarContainer - building block

An example of its usage can be found in Kibana example plugin [examples/unified_field_list_examples](/examples/unified_field_list_examples).

Configure the field list:
```
const getCreationOptions: UnifiedFieldListSidebarContainerProps['getCreationOptions'] = () => {
  return {
    originatingApp: PLUGIN_ID,
    localStorageKeyPrefix: 'examples',
    timeRangeUpdatesType: 'timefilter',
    disablePopularFields: true,
    ... // more customization option are available
  };
};
```

Define a ref for accessing API if necessary:
```
const unifiedFieldListContainerRef = useRef<UnifiedFieldListSidebarContainerApi>(null);
```

where `unifiedFieldListContainerRef.current` provides the following API: 

```
refetchFieldsExistenceInfo: ExistingFieldsFetcher['refetchFieldsExistenceInfo'];
closeFieldListFlyout: () => void;
// no user permission or missing dataViewFieldEditor service will result in `undefined` API methods
createField: undefined | (() => void);
editField: undefined | ((fieldName: string) => void);
deleteField: undefined | ((fieldName: string) => void);
```

Include the building block into your application:
```
<UnifiedFieldListSidebarContainer
  ref={unifiedFieldListContainerRef}
  // `responsive` is to show the list for desktop view and a button which triggers a flyout with the list for mobile view
  variant="responsive" // can be also `list-always` and `button-and-flyout-always`
  getCreationOptions={getCreationOptions}
  services={services}
  dataView={dataView}
  allFields={dataView.fields}
  workspaceSelectedFieldNames={selectedFieldNames}
  onAddFieldToWorkspace={onAddFieldToWorkspace}
  onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
  onAddFilter={onAddFilter}
  onFieldEdited={onFieldEdited}
/>
```

---

## Field Stats and Field Popover Components - can be also used as a building block

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

## Field List subcomponents (for low level customization, otherwise consider using UnifiedFieldListSidebarContainer)

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

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
