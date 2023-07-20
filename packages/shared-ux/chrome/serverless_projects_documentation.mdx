# Serverless project navigation

## Introduction

Welcome to the documentation for the serverless project navigation. We've exposed the tools to assist teams in building the navigation for their serverless projects.

- [Serverless project navigation](#serverless-project-navigation)
  - [Left Side Navigation](#left-side-navigation)
    - [Navigation Tree Definition](#navigation-tree-definition)
      - [Example](#example)
      - [Navigation tree API](#navigation-tree-api)
        - [`NavigationTreeDefinition`](#navigationtreedefinition)
        - [`GroupDefinition`](#groupdefinition)
        - [`RecentlyAccessedDefinition`](#recentlyaccesseddefinition)
    - [React components](#react-components)
      - [`unstyled`](#unstyled)
  - [Breadcrumbs](#breadcrumbs)
  - [Toolbar](#toolbar)
  - [Search bar](#search-bar)

### Building Blocks

The serverless navigation is composed of several key building blocks that work together to form a comprehensive navigation system. These building blocks include:

1. **Left Side Navigation**: Allow users to navigate through different sections of the project.
2. **Breadcrumbs**: A visual representation of the user's current location within the navigation hierarchy.
3. **Toolbar**: A customizable toolbar that provides quick access to important actions and features.
4. **Search Bar**: A search input field that enables users to quickly access specific content within the project.

In the following sections, we will explore each of these building blocks in detail.

## Left Side Navigation

The left side navigation serves as a primary means for users to navigate through different sections of the project. There are two approaches to building the side navigation:

1. **Navigation tree definition**: Developers provide a navigation tree definition. This approach is recommended if there are no needs of custom UI outside of the existing building blocks.

2. **React Components**: Alternatively, we provide a set of pre-built components that can be used to construct the left side navigation. These components include:

`<Navigation />`: The parent component that encapsulates the entire navigation area.
`<Navigation.Group />`: A component representing a group of navigation items.
`<Navigation.Item />`: A component representing an individual navigation item.
`<Navigation.Footer />`: A component for displaying additional content at the bottom of the navigation.
`<Navigation.RecentlyAccessed />`: A component for displaying a list of recently accessed items.

By leveraging these components, we can easily create a customized left side navigation for our serverless project.

**Note:** Both approaches are mostly **identicaly** regarding the properties that can be passed. Those properties will be documented in the tree definition section below.

### Navigation Tree Definition

To create your left side navigation using a tree definition you use the `NavigationTreeDefinition` interface. This interface allows you to define the complete navigation tree, including the **body** and **footer** of the navigation.

#### Example

Let's start by seeing an example and we'll detail the different properties below.

```ts
import { type NavigationTreeDefinition, getPresets } from '@kbn/shared-ux-chrome-navigation';

const navigationTree: NavigationTreeDefinition = {
  body: [
    { type: 'recentlyAccessed' }, // Add the recently accessed items
    {
      type: 'navGroup', // A top level group
      id: 'search_project_nav',
      title: 'Elasticsearch',
      icon: 'logoElasticsearch',
      defaultIsCollapsed: false,
      breadcrumbStatus: 'hidden',
      children: [
        {
          id: 'search_getting_started',
          title: 'Getting started,
          link: 'serverlessElasticsearch', // All **internal** links must be deepLinks
        },
        {
          id: 'explore',
          title: 'Explore', // A nested group with its children
          children: [
            {
              link: 'discover',
            },
            {
              link: 'dashboards',
            },
            {
              link: 'visualize',
            },
          ],
        },
      ],
    },
    {
      type: 'navGroup',
      ...getPresets('ml'), // Insert all the machine learning links
    },
  ],
  footer: [
    {
      type: 'navGroup',
      id: 'project_settings_project_nav',
      title: 'Project settings',
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      children: [
        {
          id: 'settings',
          children: [
            {
              link: 'management',
              title: 'Management',
            },
            {
              id: 'cloudLinkUserAndRoles',
              cloudLink: 'userAndRoles', // Add an external link to Cloud
            },
            {
              id: 'cloudLinkPerformance',
              cloudLink: 'performance',
            },
          ],
        },
      ],
    },
  ],
};
```

Once the navigation tree is defined we need to

1. Pass it to the `<DefaultNavigation />` component
2. Set your navigation component in the `serverless` plugin

```ts
import { DefaultNavigation, NavigationKibanaProvider } from '@kbn/shared-ux-chrome-navigation';

const createServerlessSearchSideNavComponent =
  (
    core: CoreStart,
    { serverless, cloud }: { serverless: ServerlessPluginStart; cloud: CloudStart }
  ) =>
  () => {
    return (
      <NavigationKibanaProvider core={core} serverless={serverless} cloud={cloud}>
        <DefaultNavigation navigationTree={navigationTree} dataTestSubj="svlSearchSideNav" />
      </NavigationKibanaProvider>
    );
  };

// plugin.ts (public) "start()"
serverless.setSideNavComponent(createComponent(core, { serverless, cloud }));
```

#### Navigation tree API

##### `NavigationTreeDefinition`

| Property | Type | Description |
| --- | --- | --- |
| `body` | `RootNavigationItemDefinition[]` | The main content of the navigation, which can contain various types of items such as `cloudLink`, `recentlyAccessed`, or `navGroup`. |
| `footer` | `RootNavigationItemDefinition[]` | The footer content of the navigation, which can contain additional items similar to the `body` section. |

Each item in the `body` or `footer` arrays can have its own unique structure defined by the `RootNavigationItemDefinition` interface.

The `RootNavigationItemDefinition` is one of:

- `GroupDefinition`
- `RecentlyAccessedDefinition`

##### `GroupDefinition`

The `GroupDefinition` interface represents a group of items in the side navigation. It extends the `NodeDefinition` interface and has the following additional properties:

| Property | Type | Description |
| --- | --- | --- |
| `type` | `'navGroup'` | Indicates that this item is a navigation group. |
| `defaultIsCollapsed` | `boolean` | Determines if the group is initially collapsed or expanded. Use `undefined` (recommended) to open the group if any of its children nodes match the current URL, `false` to always open the group, or `true` to always collapse it. |
| `preset` | `NavigationGroupPreset` | A preset value for the group, such as `'analytics'`, `'devtools'`, `'ml'`, or `'management'`. |
| `id` | `Id` | Optional ID of the navigation node. |
| `title` | `string` | Optional title of the navigation node. If not provided and a "link" is provided, the title will be the Deep link title. |
| `link` | `LinkId` | Optional App ID or deep link ID for the navigation node. |
| `cloudLink` | `CloudLinkId` | Optional cloud link ID for the navigation node. |
| `icon` | `string` | Optional icon for the navigation node. Note that not all navigation depths will render the icon. |
| `children` | `NodeDefinition[]` | Optional children of the navigation node. |
| `href` | `string` | Use `href` for absolute links only. Internal links should use "link". |
| `getIsActive` | `function` | Optional function to control the active state. This function is called whenever the location changes. |
| `breadcrumbStatus` | `'hidden' | 'visible'` | An optional flag to indicate if the breadcrumb should be hidden when this node is active. The default value is `'visible'`. |

##### `RecentlyAccessedDefinition`

| Property | Type | Description |
| --- | --- | --- |
| `type` | `'recentlyAccessed'` | Indicates that this item represents the recently accessed section. |
| `recentlyAccessed$` | `Observable<RecentItem[]>` | An optional observable for recently accessed items. If not provided, the recently accessed items from the Chrome service will be used. |
| `defaultIsCollapsed` | `boolean` | If set to `true`, the recently accessed list will be collapsed by default. The default value is `false`. |

### React components

If you need other navigation sections in your navigation you will need to use our React components. They have the same properties as seen above with the exception of the `unstyled` prop that we will detail below.

```ts
import { NavigationKibanaProvider, Navigation } from '@kbn/shared-ux-chrome-navigation';

const createServerlessSearchSideNavComponent =
  (
    core: CoreStart,
    { serverless, cloud }: { serverless: ServerlessPluginStart; cloud: CloudStart }
  ) =>
  () => {
    return (
      <NavigationKibanaProvider core={core} serverless={serverless} cloud={cloud}>
        <Navigation>
          <Navigation.Group id="group1" title="Group 1" defaultIsCollapsed={false}>
            <Navigation.Item id="item1" title="Item 1" />
            <Navigation.Item id="item2" title="Item 2" />
            <Navigation.Item id="item3" title="Item 3" />
          </Navigation.Group id="group1" title="Group 1">
        </Navigation>
      </NavigationKibanaProvider>
    );
  };
```

And as with the tree definition above you will have to set the navigation component on the `serverless` plugin.

```ts
// plugin.ts (public) "start()"
serverless.setSideNavComponent(createComponent(core, { serverless, cloud }));
```

#### `unstyled`

If you want to completely customize your UI and just need to declare you navigation tree you can pass the `unstyled` property to your `<Navigation />`.

```ts
/**
 * This JSX will correctly declare your tree structure but will not have any UI applied.
 Tree generated:
[{
  id: 'my-group',
  title: "My Group,
  children: [{
    id: 'item-1',
    title: 'Item 1',
  }, {
    id: 'item-2',
    title: 'Item 2',
  }]
}]
 */
<Navigation unstyled>
  <Navigation.Group id="my-group" title="My group">
    <Navigation.Item id="item-1" title="Item 1">
      <div>Your custom UI</div>
    </Navigation.Item>
    <Navigation.Item id="item-2" title="Item 2">
      <div>Your custom UI</div>
    </Navigation.Item>
  </Navigation.Group>
</Navigation>
```

## Breadcrumbs

TODO

## Toolbar

TODO

## Search bar

TODO