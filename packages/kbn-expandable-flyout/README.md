# @kbn/expandable-flyout

## Purpose

This package offers an expandable flyout UI component and a way to manage the data displayed in it. The component leverages the [EuiFlyout](https://github.com/elastic/eui/tree/main/src/components/flyout) from the EUI library.

The flyout is composed of 3 sections:
- a right section (primary section) that opens first
- a left wider section to show more details
- a preview section, that overlays the right section. This preview section can display multiple panels one after the other and displays a `Back` button

At the moment, displaying more than one flyout within the same plugin might be complicated, unless there are in difference areas in the codebase and the contexts don't conflict with each other.

## What the package offers

The ExpandableFlyout [React component](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/components/index) that renders the UI.

The ExpandableFlyout [React context](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/components/context) that exposes the following api:
- **openFlyout**: open the flyout with a set of panels
- **openFlyoutRightPanel**: open a right panel
- **openFlyoutLeftPanel**: open a left panel
- **openFlyoutPreviewPanel**: open a preview panel
- **closeFlyoutRightPanel**: close the right panel
- **closeFlyoutLeftPanel**: close the left panel
- **closeFlyoutPreviewPanel**: close the preview panels
- **previousFlyoutPreviewPanel**: navigate to the previous preview panel
- **closeFlyout**: close the flyout

To retrieve the flyout's layout (left, right and preview panels), you can use the **panels** from the same [React context](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/components/context);

- To have more details about how these above api work, see the code documentation [here](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/utils/helpers).

## Usage

To use the expandable flyout in your plugin, first you need wrap your code with the context provider at a high enough level as follows:
```typescript jsx
<ExpandableFlyoutProvider>
  
  ...
  
</ExpandableFlyoutProvider>
```

Then use the React UI component where you need:

```typescript jsx
<ExpandableFlyout registeredPanels={myPanels} />
```
where `myPanels` is a list of all the panels that can be rendered in the flyout (see interface [here](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/components/index)).


## Terminology

### Section

One of the 3 areas of the flyout (left, right or preview).

### Panel

A set of properties defining what's displayed in one of the flyout section.

## Future work

- currently the panels are aware of their width. This should be changed and the width of the left, right and preview sections should be handled by the flyout itself
- add the feature to save the flyout state (layout) to the url
- introduce the notion of scope to be able to handle more than one flyout per plugin??