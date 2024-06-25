# @kbn/expandable-flyout

## Purpose

This package offers an expandable flyout UI component and a way to manage the data displayed in it. The component leverages the [EuiFlyout](https://github.com/elastic/eui/tree/main/src/components/flyout) from the EUI library.

The flyout is composed of 3 sections:
- a right section (primary section) that opens first
- a left wider section to show more details
- a preview section, that overlays the right section. This preview section can display multiple panels one after the other and displays a `Back` button

> Run `yarn storybook expandable_flyout` to take a quick look at the expandable flyout in action

## Design decisions

The expandable-flyout is making some strict UI design decisions:
- when in collapsed mode (i.e. when only the right/preview section is open), the flyout's width linearly grows from its minimum value of 380px to its maximum value of 750px
- when in expanded mode (i.e. when the left section is opened), the flyout's width changes depending on the browser's width:
  - if the window is smaller than 1600px, the flyout takes the entire browser window (minus 48px of padding on the left)
  - for windows bigger than 1600px, the flyout's width is 80% of the entire browser window (with a max width of 1500px for the left section, and 750px for the right section)

> While the expandable-flyout will work on very small screens, having both the right and left sections visible at the same time will not be a good experience to the user. We recommend only showing the right panel, and therefore handling this situation when you build your panels by considering hiding the actions that could open the left panel (like the expand details button in the [FlyoutNavigation](https://github.com/elastic/kibana/tree/main/x-pack/plugins/security_solution/public/flyout/shared/components/flyout_navigation.tsx)).

## State persistence

The expandable flyout offers 2 ways of managing its state:

### Memory storage

The default behavior saves the state of the flyout in memory. The state is internal to the package and based on an isolated redux context. Using this mode means the state will not be persisted when sharing url or reloading browser pages.

### Url storage

The second way (done by setting the `urlKey` prop to a string value) saves the state of the flyout in the url. This allows the flyout to be automatically reopened when users refresh the browser page, or when users share an url. The `urlKey` will be used as the url parameter. 

**_Note: the word `memory` cannot be used as an `urlKey` as it is reserved for the memory storage behavior. You can use any other string value, try to use something that should be unique._**

> We highly recommend NOT nesting flyouts in your code, as it would cause conflicts for the url keys. We recommend instead to build multiple panels, with each their own context to manage their data (for example, take a look at the Security Solution [setup](https://github.com/elastic/kibana/tree/main/x-pack/plugins/security_solution/public/flyout)).
>
> A good solution is for example to have one instance of a flyout at a page level, and then have multiple panels that can be opened in that flyout.


## Package API

The ExpandableFlyout [React component](https://github.com/elastic/kibana/tree/main/packages/kbn-expandable-flyout/src/index.tsx) renders the UI, leveraging an [EuiFlyout](https://eui.elastic.co/#/layout/flyout).

To retrieve the flyout's layout (left, right and preview panels), you can utilize [useExpandableFlyoutState](https://github.com/elastic/kibana/blob/main/packages/kbn-expandable-flyout/src/hooks/use_expandable_flyout_state.ts).

To control (or mutate) flyout's layout, you can utilize [useExpandableFlyoutApi](https://github.com/elastic/kibana/blob/main/packages/kbn-expandable-flyout/src/hooks/use_expandable_flyout_api.ts).

**Expandable Flyout API** exposes the following methods:
- **openFlyout**: open the flyout with a set of panels
- **openRightPanel**: open a right panel
- **openLeftPanel**: open a left panel
- **openPreviewPanel**: open a preview panel
- **closeRightPanel**: close the right panel
- **closeLeftPanel**: close the left panel
- **closePreviewPanel**: close the preview panels
- **previousPreviewPanel**: navigate to the previous preview panel
- **closeFlyout**: close the flyout

> The expandable flyout propagates the `onClose` callback from the EuiFlyout component. As we recommend having a single instance of the flyout in your application, it's up to the application's code to dispatch the event (through Redux, window events, observable, prop drilling...). 

## Usage

To use the expandable flyout in your plugin, first you need wrap your code with the [context provider](https://github.com/elastic/kibana/blob/main/packages/kbn-expandable-flyout/src/context.tsx) at a high enough level as follows:
```typescript jsx
// state stored in the url
<ExpandableFlyoutProvider urlKey={'myUrlKey'}>
  ...
</ExpandableFlyoutProvider>


// state stored in memory
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
