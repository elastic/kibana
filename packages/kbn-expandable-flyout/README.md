# @kbn/expandable-flyout

## Purpose

This package offers an expandable flyout UI component and a way to manage the data displayed in it. The component leverages the [EuiFlyout](https://github.com/elastic/eui/tree/main/src/components/flyout) from the EUI library.

The flyout is composed of 3 sections:
- a right section (primary section) that opens first
- a left wider section to show more details
- a preview section, that overlays the right section. This preview section can navigate through multiple panels

## Requirements

The packages heavily leverages the use of [Redux](https://react-redux.js.org/). The panels are saved in the Redux store.

It requires the store to be setup in your plugin, as well as a selector to retrieve the panels fromt he store.

## What the package offers

A set of Redux actions (more details in the code [here](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/store/reducers)):
- **openFlyout**: open the flyout with a set of panels for a scope
- **openFlyoutRightPanel**: open a right panel for a scope
- **openFlyoutLeftPanel**: open a left panel for a scope
- **openFlyoutPreviewPanel**: open a preview panel for a scope
- **closeFlyoutRightPanel**: close the right panel for the scope
- **closeFlyoutLeftPanel**: close the left panel for the scope
- **closeFlyoutPreviewPanel**: close the preview panels for the scope
- **previousFlyoutPreviewPanel**: navigate to the previous preview panel for the scope
- **closeFlyout**: close the flyout

A [function](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/store/reducers) be used in a Redux selector, 
to help retrieve the panels, nicely formatted as a usable [layout](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/models/layout).

The [ExpandableFlyout](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/components/expandable_flyout) React component that renders the UI.

## Terminology

### Section

One of the 3 areas of the flyout (left, right or preview).

### Panel

A set of properties defining what's displayed in one of the flyout section.

### Scope

A string (should be unique) to save a set of panels for a specific usage (basically we have one flyout per scope).
