This package provides a uniform interface for displaying UI actions for a cell.
For the `CellActions` component to work, it must be wrapped by `CellActionsContextProvider`. Ideally, the wrapper should stay on the top of the rendering tree.

Example:
```JSX
<CellActionsContextProvider
    // call uiActions.getTriggerCompatibleActions(triggerId, data)
    getCompatibleActions={getCompatibleActions}>
    ...
    <CellActions mode={CellActionsMode.HOVER_POPOVER} triggerId={MY_TRIGGER_ID} config={{ field: 'fieldName', value: 'fieldValue', fieldType: 'text' }}>
        Hover me
    </CellActions>
</CellActionsContextProvider>

```

`CellActions` component will display all compatible actions registered for the trigger id.