This is a fork of [react-monaco-editor project](https://github.com/react-monaco-editor/react-monaco-editor) that is a Monaco editor wrapper for React.
This fork is needed to apply a change that fixes the editor behavior in Kibana when running React@18 in Legacy Mode and the bug is described [here](https://github.com/facebook/react/issues/31023)
The change is to replace the `useEffect` hook with `useLayoutEffect` when the editor is in controlled mode and the value is updated from prop.

```diff
---useEffect(() => {
+++useLayoutEffect(() => {
    if (editor.current) {
      if (value === editor.current.getValue()) {
        return;
      }

      const model = editor.current.getModel();
      __prevent_trigger_change_event.current = true;
      editor.current.pushUndoStop();
      // pushEditOperations says it expects a cursorComputer, but doesn't seem to need one.
      model.pushEditOperations(
        [],
        [
          {
            range: model.getFullModelRange(),
            text: value,
          },
        ],
        undefined,
      );
      editor.current.pushUndoStop();
      __prevent_trigger_change_event.current = false;
    }
  }, [value]);
```

In addition, the fork only includes functionality that is used in Kibana and removes the rest of the code that is not needed.
