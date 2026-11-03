# @kbn/inspect-component-plugin

A developer tool for inspecting React components directly in the Kibana UI. It provides an overlay to highlight component boundaries and a flyout with detailed information and action buttons which let you open the component's source file in your preferred editor (VSCode, WebStorm, Cursor) or on GitHub/GitHub.dev.

## How to Use

1. Click the "Inspect" button (inspect icon) in the application header or use the keyboard shortcut (`⌘ + '` on Mac or `Ctrl + '` on Windows/Linux).
2. Move your mouse over the UI. The component under the cursor will be highlighted.
3. Click on the highlighted component to open a flyout with detailed information.

### Grab component context for coding agents

The "Grab" button (copy icon) in the developer toolbar, or the keyboard shortcut (`⌘ + ⇧ + '` on Mac or `Ctrl + Shift + '` on Windows/Linux), toggles grab mode. It works like inspect mode, but the highlighted element becomes a drag handle: drag it straight into your coding agent's chat (Cursor, Claude Code, a terminal, etc.) like you would drag an image into Slack, and an agent-friendly description is dropped as plain text. The same description is copied to the clipboard on drag start or on click, so you can also paste it. Grab mode stays active until you toggle it off or press `Esc`:

```
<button class="euiButton" type="button" data-test-subj="saveButton">Save</button>
  in SaveButton (src/platform/plugins/shared/foo/public/components/save_button.tsx:42:7)
  in FooPanel (src/platform/plugins/shared/foo/public/components/foo_panel.tsx:118:5)
  in FooApp (src/platform/plugins/shared/foo/public/application.tsx:30:9)
```

The first line is the grabbed element (children stripped, text content kept). Each `in` line pairs a component with the location of the JSX it renders, from the closest component up to the application root. EUI internals and other compiled code without source information are skipped.

## How it Works

The plugin relies on a Babel preset (`@kbn/babel-preset`) which, when in development mode, injects source location information into `__reactFiber$` object of every React component as `_debugSource` property and parent component information as `_debugOwner` property. `_debugSource` provides the file path, line number and column number.

The `InspectButton` is the entry point, located in the main application header. It toggles the inspection mode on and off. When inspection mode is active, the `InspectOverlay` component is rendered. The overlay uses global `pointermove`, `pointerdown` and `click` event listeners to track the cursor and intercept clicks. Once you click on the component under the cursor, the tool uses the `event.target` to traverses up the React Fiber tree to find the associated component information and then the `InspectFlyout` is displayed with information about the component, including path, source location, and action buttons to view the component's code.

In grab mode the same overlay is used, but the `InspectHighlight` box is rendered with `pointer-events: auto` and `draggable`, turning it into a native HTML5 drag source (the `pointerdown` listener lets events from the overlay through, as a cancelled `pointerdown` suppresses native drag and drop). On `dragstart`, `buildGrabContext` walks the `_debugOwner` chain of the inspected fiber to build the component stack, the result is set as `text/plain` drag data, the hovered element is used as the drag image via `setDragImage` and the text is also copied to the clipboard. Because `dataTransfer` has to be populated synchronously, the repository root is resolved once up front through the `/internal/inspect_component/inspect` route on the first hover and reused to shorten all file paths.

## Configuration

- This tool is only available when Kibana is running in development mode.
- You need to enable the funcionality by setting `inspect_component.enabled: true` in `kibana.dev.yml`.
