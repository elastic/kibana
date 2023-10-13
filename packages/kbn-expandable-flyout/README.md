# @kbn/expandable-flyout

## Purpose

This package offers an expandable flyout UI component and a way to manage the data displayed in it. The component leverages the [EuiFlyout](https://github.com/elastic/eui/tree/main/src/components/flyout) from the EUI library.

The flyout is composed of 3 sections:
- a right section (primary section) that opens first
- a left wider section to show more details
- a preview section, that overlays the right section. This preview section can display multiple panels one after the other and displays a `Back` button

> Run `yarn storybook expandable_flyout` to take a quick look at the expandable flyout in action

## Design decisions

The expandable-flyout package is designed to render a single flyout for an entire plugin. While displaying multiple flyouts might be feasible, it will be a bit complicated, and we recommend instead to build multiple panels, with each their own context to manage their data (for example, take a look at the Security Solution [setup](https://github.com/elastic/kibana/tree/main/x-pack/plugins/security_solution/public/flyout)).

The expandable-flyout is making some strict UI design decisions:
- when in collapsed mode (i.e. when only the right/preview section is open), the flyout's width is fixed to the EUI `s` size
- when in expanded mode (i.e. when the left section is opened), the flyout's width is fixed to the EUI `l` size. Internally the right, left and preview sections' widths are set to a hardcoded percentage (40%, 60$ and 40% respectively)

## Package API

The ExpandableFlyout [React component](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/index.tsx) renders the UI, leveraging an [EuiFlyout](https://eui.elastic.co/#/layout/flyout).

The ExpandableFlyout [React context](https://github.com/elastic/kibana/blob/main/packages/kbn-expandable-flyout/src/context.tsx) manages the internal state of the expandable flyout, and exposes the following api:
- **openFlyout**: open the flyout with a set of panels
- **openRightPanel**: open a right panel
- **openLeftPanel**: open a left panel
- **openPreviewPanel**: open a preview panel
- **closeRightPanel**: close the right panel
- **closeLeftPanel**: close the left panel
- **closePreviewPanel**: close the preview panels
- **previousPreviewPanel**: navigate to the previous preview panel
- **closeFlyout**: close the flyout

To retrieve the flyout's layout (left, right and preview panels), you can use the **panels** from the same [React context](https://github.com/elastic/kibana/blob/main/packages/kbn-expandable-flyout/src/context.tsx).

## Usage

To use the expandable flyout in your plugin, first you need wrap your code with the [context provider](https://github.com/elastic/kibana/blob/main/packages/kbn-expandable-flyout/src/context.tsx) at a high enough level as follows:
```typescript jsx
<ExpandableFlyoutProvider>
  
  ...
  
</ExpandableFlyoutProvider>
```

Then use the [React UI component](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/index.tsx) where you need:

```typescript jsx
<ExpandableFlyout registeredPanels={myPanels} />
```
_where `myPanels` is a list of all the panels that can be rendered in the flyout_


## Terminology

### Section

One of the 3 areas of the flyout (**left**, **right** or **preview**).

### Panel

A set of properties defining what's displayed in one of the flyout section (see interface [here](https://github.com/elastic/kibana/blob/main/packages/kbn-expandable-flyout/src/types.ts)).
