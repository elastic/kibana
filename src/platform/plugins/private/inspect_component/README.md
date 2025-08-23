# @kbn/inspect-component-plugin

A developer tool for inspecting React components directly in the Kibana UI. It provides an overlay to highlight component boundaries and a flyout with detailed information and action buttons which let you open the component's source file in your preferred editor (VSCode, WebStorm, Cursor) or on GitHub/GitHub.dev.

## How to Use

1. Click the "Inspect" button (inspect icon) in the application header or use the keyboard shortcut (`⌘ + '` on Mac, `Ctrl + '` on Windows/Linux).
2. Move your mouse over the UI. The component under the cursor will be highlighted, and its name will be displayed.
3. Click on a highlighted component to open a flyout with detailed information.

## How it Works

The tool relies on a Babel preset (`@kbn/babel-preset`) which, when in development mode, injects source location information into `fiber` object of every React component, as `_debugSource` property. This provides the file path, line number and column number for each component.

The `InspectButton` is the entry point, located in the main application header. It toggles the inspection mode on and off. When inspection mode is active, the `InspectOverlay` component is rendered. The overlay uses global `pointermove` and `pointerdown` event listeners to track the cursor and handle clicks. Once you click on a an HTML element under the cursor, the tool uses the `event.target` to traverses up the React Fiber tree to find the associated component information and then the `InspectFlyout` is displayed with the collected information, including the component path, source location, and action buttons to open the code.

## Configuration

- This tool is only available when Kibana is run in development mode.
- You need to enable the funcionality by setting `inspect_component.enabled: true` in `kibana.dev.yml`.
