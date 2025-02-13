This package provides a uniform interface for displaying UI actions for a cell.
For the `CellActions` component to work, it must be wrapped by `CellActionsProvider`. Ideally, the wrapper should stay on the top of the rendering tree.

Example:

```JSX
<CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
    [...]
    <CellActions mode={CellActionsMode.HOVER_DOWN} triggerId={MY_TRIGGER_ID} config={{ field: 'fieldName', value: 'fieldValue', fieldType: 'text' }}>
        Hover me
    </CellActions>
</CellActionsProvider>
```

`CellActions` component will display all compatible actions registered for the trigger id.
