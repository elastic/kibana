# @kbn/inspect-component-plugin

A developer tool for inspecting React components directly in the Kibana UI. It provides an overlay to highlight component boundaries and a flyout with detailed information and action buttons which let you open the component's source file in your preferred editor (VSCode, WebStorm, Cursor) or on GitHub/GitHub.dev.

## How to Use

1. Click the "Inspect" button (inspect icon) in the application header or use the keyboard shortcut (`⌘ + '` on Mac or `Ctrl + '` on Windows/Linux).
2. Move your mouse over the UI. The component under the cursor will be highlighted.
3. Click on the highlighted component to open a flyout with detailed information.

### Grab component context for coding agents

The "Grab" button (move icon) in the developer toolbar, or the keyboard shortcut (`⌘ + ⇧ + '` on Mac or `Ctrl + Shift + '` on Windows/Linux), toggles grab mode. It works like inspect mode, but the highlighted element becomes a drag handle: drag it straight into your coding agent's chat (Cursor, Claude Code, a terminal, etc.) like you would drag an image into Slack, and an agent-friendly description is dropped as plain text. The same description is copied to the clipboard on drag start, on click or on `⌘ + C` / `Ctrl + C` while an element is highlighted, so you can also paste it. Grab mode stays active until you toggle it off or press `Esc`. Only one mode can be active at a time, turning on inspect or grab turns the other one off:

```
<button class="euiButton" type="button" data-test-subj="saveButton">Save</button>
  in SaveButton (src/platform/plugins/shared/foo/public/components/save_button.tsx:42:7)
  in FooPanel (src/platform/plugins/shared/foo/public/components/foo_panel.tsx:118:5)
  in FooApp (src/platform/plugins/shared/foo/public/application.tsx:30:9)
```

The first line is the grabbed element (children stripped, text content kept). Each `in` line pairs a component with the location of the JSX it renders, from the closest component outwards. EUI internals and other compiled code without source information are skipped, unnamed components (e.g. `memo(() => …)`) and JSX created outside of a render show up as `Anonymous`. The stack is pruned to what an agent can act on: wrapper frames (`Anonymous`, providers, boundaries, higher order components and anything located in the routing, link and rendering context packages) are dropped except for the closest frame, consecutive frames of the same file or component are collapsed, and beyond the three closest frames only the frames where the stack crosses into another plugin or package are kept, so the application rendering a shared component is still named.

## How it Works

The plugin relies on a Babel preset (`@kbn/babel-preset`) which, when in development mode, injects source location information into `__reactFiber$` object of every React component as `_debugSource` property and parent component information as `_debugOwner` property. `_debugSource` provides the file path, line number and column number. Reading fibers and resolving the component, EUI component and component stack behind a DOM element is done with the helpers from `@kbn/react-fiber`. Only `getDebugSource` there reads `_debugSource`, see that package's README for React 19, which drops it.

The `InspectButton` is the entry point, located in the main application header. It toggles the inspection mode on and off. When inspection mode is active, the `InspectOverlay` component is rendered. The overlay uses global `pointermove`, `pointerdown` and `click` event listeners to track the cursor and intercept clicks. The developer toolbar is exempt, including the dialogs it renders through portals (`isRenderedWithin` from `@kbn/react-fiber`), so its buttons keep switching modes and its settings stay usable, and the highlight disappears while the cursor is over it. Once you click on the component under the cursor, the tool uses the `event.target` to traverses up the React Fiber tree to find the associated component information and then the `InspectFlyout` is displayed with information about the component, including path, source location, and action buttons to view the component's code.

In grab mode the same overlay is used, but the `InspectHighlight` box is rendered with `pointer-events: auto` and `draggable`, turning it into a native HTML5 drag source. Presses on the box are stopped, so outside click detectors don't close the popover or flyout being grabbed, but not cancelled, as a cancelled `pointerdown` suppresses native drag and drop. On `dragstart`, `buildGrabContext` formats the component stack (`getComponentStack` from `@kbn/react-fiber`) of the inspected fiber, the result is set as `text/plain` drag data, the hovered element is used as the drag image via `setDragImage` and the text is also copied to the clipboard. Because `dataTransfer` has to be populated synchronously, the repository root is resolved once up front through the `/internal/inspect_component/inspect` route on the first hover and reused to shorten all file paths.

## Configuration

- This tool is only available when Kibana is running in development mode.
- You need to enable the funcionality by setting `inspect_component.enabled: true` in `kibana.dev.yml`.
