# Serverless project navigation

## Introduction

Welcome to the documentation for the serverless project navigation. We've exposed the tools to assist teams in building the navigation for their serverless projects.
Project navigation is an alternative to the default Kibana navigation. It is designed to be more flexible and customizable to the needs of each project. Project navigation replaces default Kibana navigation in serverless mode.

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
    - [Deep links](#deep-links)
    - [Cloud link](#cloud-links)
    - [Preconfigured navigation sections](#preconfigured-navigation-sections)
  - [Breadcrumbs](#breadcrumbs)
  - [Toolbar](#toolbar)
  - [Global Search](#global-search)

### Building Blocks

The serverless navigation is composed of several key building blocks that work together to form a comprehensive navigation system. These building blocks include:

1. **Left Side Navigation**: Allow users to navigate through different sections of the project.
2. **Breadcrumbs**: A visual representation of the user's current location within the navigation hierarchy.
3. **Toolbar**: A customizable toolbar that provides quick access to important actions and features.
4. **Global Search**: A navigational search input that enables users to quickly access specific content within the project.

In the following sections, we will explore each of these building blocks in detail.

## Left Side Navigation

> **Note**
> Left Side Navigation is available in shared_ux storybook under the `Chrome/Navigation` section. You can explore the components and their properties there.
> `yarn storybook shared_ux`

The left side navigation is a primary way for users to navigate through different sections of the project. It consists of a tree of navigation items that can be expanded and collapsed. Apart from the navigation tree it also supports special pre-built blocks like recently accessed items. The main part of the navigation tree is project's navigation - part that is fully configured and supported by the project teams (e.g. Observability). We also provide pre-configured platform sections as presets that solutions can use as part of their navigation (e.g. `ml`, `analytics`). Solutions can customize those sections to their needs.

There are two approaches to building the side navigation:

1. **Navigation tree definition**: Developers provide a navigation tree definition. This approach is recommended if there are no needs of custom UI outside of the existing building blocks.

2. **React Components**: Alternatively, we provide a set of pre-built components that can be used to construct the left side navigation. These components include:

`<Navigation />`: The parent component that encapsulates the entire navigation area.
`<Navigation.Group />`: A component representing a group of navigation items.
`<Navigation.Item />`: A component representing an individual navigation item.
`<Navigation.Footer />`: A component for displaying additional content at the bottom of the navigation.
`<Navigation.RecentlyAccessed />`: A component for displaying a list of recently accessed items.

By leveraging these components, you can create a customized left side navigation for a serverless project.

> **Note**
> Both approaches are mostly **identically** regarding the properties that can be passed. Some of those properties will be documented in the tree definition section below.

### Navigation Tree Definition

To create your left side navigation using a tree definition you use the `NavigationTreeDefinition` interface. This interface allows you to define the complete navigation tree, including the **body** and **footer** of the navigation.

#### Example

Let's start by seeing an example, and we'll detail the different properties below.

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
          title: 'Getting started',
          link: 'serverlessElasticsearch', // All **internal** links must be deepLinks (core's `app.deepLinks`), learn more in #deep-links section
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
      ...getPresets('ml'), // Insert all the machine learning links, learn more in #preconfigured-navigation-presets section
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
              cloudLink: 'userAndRoles', // Add an external link to Cloud, learn more in #cloud-links section
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

```tsx
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

> **Warning**
> The API reference is manually maintained and might be out of date. Please refer [to the source](https://github.com/sebelga/kibana/blob/project-navigation-documentation/packages/shared-ux/chrome/navigation/src/ui/types.ts) for the most up-to-date information. We are working on automating the API reference.

##### `NavigationTreeDefinition`

| Property | Type                             | Description                                                                                                                          |
| -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `body`   | `RootNavigationItemDefinition[]` | The main content of the navigation, which can contain various types of items such as `cloudLink`, `recentlyAccessed`, or `navGroup`. |
| `footer` | `RootNavigationItemDefinition[]` | The footer content of the navigation, which can contain additional items similar to the `body` section.                              |

Each item in the `body` or `footer` arrays can have its own unique structure defined by the `RootNavigationItemDefinition` interface.

The `RootNavigationItemDefinition` is one of:

- `GroupDefinition`
- `RecentlyAccessedDefinition`

##### `GroupDefinition`

The `GroupDefinition` interface represents a group of items in the side navigation. It extends the `NodeDefinition` interface and has the following additional properties:

| Property             | Type                    | Description                                                                                                                                                                                                                        |
| -------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`               | `'navGroup'`            | Indicates that this item is a navigation group.                                                                                                                                                                                    |
| `defaultIsCollapsed` | `boolean \| undefined`  | Determines if the group is initially collapsed or expanded. Use `undefined` (recommended) to open the group if any of its children nodes match the current URL, `false` to always open the group, or `true` to always collapse it. |
| `preset`             | `NavigationGroupPreset` | A preset value for the group, such as `'analytics'`, `'devtools'`, `'ml'`, or `'management'`.                                                                                                                                      |
| `id`                 | `Id`                    | Optional ID of the navigation node.                                                                                                                                                                                                |
| `title`              | `string`                | Optional title of the navigation node. If not provided and a "link" is provided, the title will be the Deep link title.                                                                                                            |
| `link`               | `LinkId`                | Optional App ID or deep link ID for the navigation node. [More about deep links](#deep-links)                                                                                                                                      |
| `cloudLink`          | `CloudLinkId`           | Optional cloud link ID for the navigation node. [More about cloud links](#cloud-links)                                                                                                                                             |
| `icon`               | `string`                | Optional icon for the navigation node. Note that not all navigation depths will render the icon.                                                                                                                                   |
| `children`           | `NodeDefinition[]`      | Optional children of the navigation node.                                                                                                                                                                                          |
| `href`               | `string`                | Use `href` for absolute links only. Internal links should use "link".                                                                                                                                                              |
| `getIsActive`        | `function`              | Optional function to control the active state. This function is called whenever the location changes.                                                                                                                              |
| `breadcrumbStatus`   | `'hidden'\|'visible'`   | An optional flag to indicate if the breadcrumb should be hidden when this node is active. The default value is `'visible'`.                                                                                                        |

##### `RecentlyAccessedDefinition`

| Property             | Type                       | Description                                                                                                                            |
| -------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `type`               | `'recentlyAccessed'`       | Indicates that this item represents the recently accessed section.                                                                     |
| `recentlyAccessed$`  | `Observable<RecentItem[]>` | An optional observable for recently accessed items. If not provided, the recently accessed items from the Chrome service will be used. |
| `defaultIsCollapsed` | `boolean`                  | If set to `true`, the recently accessed list will be collapsed by default. The default value is `false`.                               |

### React components

If you need other navigation sections in your navigation you will need to use our React components. They have the same properties as seen above except the `unstyled` prop that we will detail below.

```tsx
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
          </Navigation.Group>

          <div>
            <p>Any other section you might need</p>
          </div>

          <Navigation.Group id="group2" title="Group 2">
            <Navigation.Item id="item1">
              <EuiText color="blue">Title can also be a React node</EuiText>
            </Navigation.Item>

            <Navigation.Group id="nestedGroup" title="Group can be nested">
              <Navigation.Item id="item1" title="Item 1" />
            </Navigation.Group>
          </Navigation.Group>
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

```tsx
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

### Deep links

[Deep links](https://github.com/elastic/kibana/blob/f5034e60a501e7b61a3e1bff34e64c9b94c71344/packages/core/application/core-application-browser/src/application.ts#L281-L314) are a Kibana core's mechanism for registering sub-pages within an app. In "classic" Kibana they are used for the default side navigation, navigation APIs and the global search. Teams can register the deep links when they register their app. They can also update or remove deep links dynamically.

The serverless navigation API uses the same deep links mechanism to configure the navigation tree. The `link` property of the `NodeDefinition` interface refers to the deep links registered by apps. The `link` property can be either a direct app id or a deep link ID.

There are multiple benefits of using deep links instead of the hardcoded URLs when configuring the navigation tree:

- Validation: the deep links are validated when the tree is built. If the deep link wasn't registered by any of the apps, an error will be thrown.
- Type safety: the list of deep links is typed, and we don't rely on static URLs that can break.
- Dynamic updates: the deep links can be updated or removed dynamically by apps that own them. The navigation tree will be updated accordingly.

Internal navigation should be configured using deep links. The `href` property should be used only for external links. There is also a special type of external links for links pointing to the cloud console - `cloudLink`.

### Cloud links

The `cloudLink` property of the `NodeDefinition` interface refers to the predefined list of cloud links that are configured in `kibana.yml`.
Currently available pages are `'userAndRoles' | 'performance' | 'billingAndSub'`

```ts
import { type NavigationTreeDefinition, getPresets } from '@kbn/shared-ux-chrome-navigation';

const navigationTree: NavigationTreeDefinition = {
  body: [
    {
      type: 'navGroup',
      id: 'topNav',
      children: [
        {
          id: 'cloudLinkUserAndRoles',
          cloudLink: 'userAndRoles',
        },
        {
          id: 'cloudLinkPerformance',
          cloudLink: 'performance',
        },
      ],
    },
  ],
};
```

### Preconfigured navigation sections

When configuring the navigation tree you can use the preconfigured sections like `devtools`, `management`, `ml`, `analytics`

```ts
import { type NavigationTreeDefinition, getPresets } from '@kbn/shared-ux-chrome-navigation';

const navigationTree: NavigationTreeDefinition = {
  body: [
    {
      type: 'navGroup',
      ...getPresets('ml'), // Insert all the machine learning links
    },
  ],
};
```

The benefit of using the preset instead of building the sectional manually is that the team who can own the preset can update it as they see fit.

You can also customize the preset like so:

```ts
import { type NavigationTreeDefinition, getPresets } from '@kbn/shared-ux-chrome-navigation';

const navigationTree: NavigationTreeDefinition = {
  body: [
    {
      type: 'navGroup',
      // And specific links from analytics
      ...getPresets('analytics'),
      title: 'My analytics', // Change the title
      children: getPresets('analytics').children.map((child) => ({
        ...child,
        children: child.children?.filter((item) => {
          // force remove discover and dashboard
          return item.link !== 'discover' && item.link !== 'dashboards';
        }),
      })) as NonEmptyArray<any>,
    },
  ],
};
```

## Breadcrumbs

TODO

## Toolbar

TODO

## Global Search

TODO
