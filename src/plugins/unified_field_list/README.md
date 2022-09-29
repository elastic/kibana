# unifiedFieldList

This Kibana plugin contains components and services for field list UI (as in fields sidebar on Discover and Lens pages).

---

## Components

* `<FieldStats .../>` - loads and renders stats (Top values, Distribution) for a data view field.

* `<FieldVisualizeButton .../>` - renders a button to open this field in Lens.

* `<FieldPopover .../>` - a popover container component for a field.

* `<FieldPopoverHeader .../>` - this header component included a field name and common actions.
* 
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

## Server APIs

* `/api/unified_field_list/field_stats` - returns the loaded field stats (except for Ad-hoc data views)

* `/api/unified_field_list/existing_fields/{dataViewId}` - returns the loaded existing fields (except for Ad-hoc data views)

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
