- Start Date: 2019-08-20
- RFC PR: TBD
- Kibana Issue: [#43499](https://github.com/elastic/kibana/issues/43499)

# Summary
Management is one of the four primary "domains" covered by @elastic/kibana-app-arch (along with Data, Embeddables, and Visualizations). There are two main purposes for this service:

1. Own the management "framework" -- the UI that displays the management sidebar nav, the landing page, and handles rendering each of the sections
2. Expose a registry for other plugins to add their own registry sections to the UI and add nested links to them in the sidebar.

The purpose of this RFC is to consider item 2 above -- the service for registering sections to the nav & loading them up.

# Motivation

## Why now?
The main driver for considering this now is that the Management API moving to the new platform is going to block other teams from completing migration, so we need to have an answer to what the new platform version of the API looks like as soon as possible in `7.x`.

## Why not just keep the current API and redesign later?
The answer to that has to do with the items that are currently used in the management implementation which must be removed in order to migrate to NP: the framework currently registers a `uiExport`, and relies on `IndexedArray`, `uiRegistry`, and `ui/routes`.

This means that we will basically need to rebuild the service anyway in order to migrate to the new platform. So if we are going to invest that time, we might as well invest it in building the API the way we want it to be longer term, rather than creating more work for ourselves later.

## Technical goals
- Remove another usage of `IndexedArray` & `uiRegistry` (required for migration)
- Remove dependency on `ui/routes` (required for migration)
- Remove management section `uiExport` (required for migration)
- Simple API that is designed in keeping with new platform principles
  - This includes being rendering-framework-agnostic... You should be able to build your management section UI however you'd like
- Clear separation of app/UI code and service code, even if both live within the same plugin
- Flexibility to potentially support alternate layouts in the future (see mockups in [reference section](#reference) below)

# Basic example
This API is influenced heavily by the [application service mounting RFC](https://github.com/elastic/kibana/blob/main/rfcs/text/0004_application_service_mounting.md). The intent is to make the experience consistent with that service; the Management section is basically one big app with a bunch of registered "subapps".

```ts
// my_plugin/public/plugin.ts

export class MyPlugin {
  setup(core, { management }) {
    // Registering a new app to a new section
    const mySection = management.sections.register({
      id: 'my-section',
      title: 'My Main Section', // display name
      order: 10,
      euiIconType: 'iconName',
    });
    mySection.registerApp({
      id: 'my-management-app',
      title: 'My Management App', // display name
      order: 20,
      async mount(context, params) {
        const { renderApp } = await import('./my-section');
        return renderApp(context, params);
      }
    });

    // Registering a new app to an existing section
    const kibanaSection = management.sections.get('kibana');
    kibanaSection.registerApp({ id: 'my-kibana-management-app', ... });
  }

  start(core, { management }) {
    // access all registered sections, filtered based on capabilities
    const sections = management.sections.getAvailable();
    sections.forEach(section => console.log(`${section.id} - ${section.title}`));
    // automatically navigate to any app by id
    management.sections.navigateToApp('my-kibana-management-app');
  }
}
 
// my_plugin/public/my-section.tsx

export function renderApp(context, { sectionBasePath, element }) {
  ReactDOM.render(
    // `sectionBasePath` would be `/app/management/my-section/my-management-app`
    <MyApp basename={sectionBasePath} />,
    element
  );
 
  // return value must be a function that unmounts (just like Core Application Service)
  return () => ReactDOM.unmountComponentAtNode(element);
}
```

We can also create a utility in `kibana_react` to make it easy for folks to `mount` a React app:
```ts
// src/plugins/kibana_react/public/mount_with_react.tsx
import { KibanaContextProvider } from './context';

export const mountWithReact = (
  Component: React.ComponentType<{ basename: string }>,
  context: AppMountContext,
  params: ManagementSectionMountParams,
) => {
  ReactDOM.render(
    (
      <KibanaContextProvider services={{ ...context }}>
        <Component basename={params.sectionBasePath} />
      </KibanaContextProvider>
    ),
    params.element
  );

  return () => ReactDOM.unmountComponentAtNode(params.element);
}

// my_plugin/public/plugin.ts
import { mountWithReact } from 'src/plugins/kibana_react/public';

export class MyPlugin {
  setup(core, { management }) {
    const kibanaSection = management.sections.get('kibana');
    kibanaSection.registerApp({
      id: 'my-other-kibana-management-app',
      ...,
      async mount(context, params) {
        const { MySection } = await import('./components/my-section');
        const unmountCallback = mountWithReact(MySection, context, params);
        return () => unmountCallback();
      }
    });
  }
}
```
 
# Detailed design

```ts
interface ManagementSetup {
  sections: SectionsServiceSetup;
}

interface ManagementStart {
  sections: SectionsServiceStart;
}
 
interface SectionsServiceSetup {
  get: (sectionId: string) => Section;
  getAvailable: () => Section[]; // filtered based on capabilities
  register: RegisterSection;
}

interface SectionsServiceStart {
  getAvailable: () => Array<Omit<Section, 'registerApp'>>; // filtered based on capabilities
  // uses `core.application.navigateToApp` under the hood, automatically prepending the `path` for the link
  navigateToApp: (appId: string, options?: { path?: string; state?: any }) => void;
}

type RegisterSection = (
  id: string,
  title: string,
  order?: number,
  euiIconType?: string, // takes precedence over `icon` property.
  icon?: string, // URL to image file; fallback if no `euiIconType`
) => Section;
 
type RegisterManagementApp = (
  id: string;
  title: string;
  order?: number;
  mount: ManagementSectionMount;
) => ManagementApp;
 
type Unmount = () => Promise<void> | void;
 
interface ManagementSectionMountParams {
  sectionBasePath: string; // base path for setting up your router
  element: HTMLElement; // element the section should render into
}

type ManagementSectionMount = (
  context: AppMountContext, // provided by core.ApplicationService
  params: ManagementSectionMountParams,
) => Unmount | Promise<Unmount>;

interface ManagementApp {
  id: string;
  title: string;
  basePath: string;
  sectionId: string;
  order?: number;
}

interface Section {
  id: string;
  title: string;
  apps: ManagementApp[];
  registerApp: RegisterManagementApp;
  order?: number;
  euiIconType?: string;
  icon?: string;
}
```

# Legacy service (what this would be replacing)

Example of how this looks today:
```js
// myplugin/index
new Kibana.Plugin({
  uiExports: {
    managementSections: ['myplugin/management'],
  }
});
 
// myplugin/public/management
import { management } from 'ui/management';
 
// completely new section
const newSection = management.register('mypluginsection', {
  name: 'mypluginsection',
  order: 10,
  display: 'My Plugin',
  icon: 'iconName',
});
newSection.register('mypluginlink', {
  name: 'mypluginlink',
  order: 10,
  display: 'My sublink',
  url: `#/management/myplugin`,
});
 
// new link in existing section
const kibanaSection = management.getSection('kibana');
kibanaSection.register('mypluginlink', {
  name: 'mypluginlink',
  order: 10,
  display: 'My sublink',
  url: `#/management/myplugin`,
});
 
// use ui/routes to render component
import routes from 'ui/routes';
 
const renderReact = (elem) => {
  render(<MyApp />, elem);
};
 
routes.when('management/myplugin', {
  controller($scope, $http, kbnUrl) {
    $scope.$on('$destroy', () => {
      const elem = document.getElementById('usersReactRoot');
      if (elem) unmountComponentAtNode(elem);
    });
    $scope.$$postDigest(() => {
      const elem = document.getElementById('usersReactRoot');
      const changeUrl = (url) => {
        kbnUrl.change(url);
        $scope.$apply();
      };
      renderReact(elem, $http, changeUrl);
    });
  },
});
```
Current public contracts owned by the legacy service:
```js
// ui/management/index
interface API {
  SidebarNav: React.FC<any>;
  management: new ManagementSection();
  MANAGEMENT_BREADCRUMB: {
    text: string;
    href: string;
  };
}

// ui/management/section
class ManagementSection {
  get visibleItems,
  addListener: (fn: function) => void,
  register: (id: string, options: Options) => ManagementSection,
  deregister: (id: string) => void,
  hasItem: (id: string) => boolean,
  getSection: (id: string) => ManagementSection,
  hide: () => void,
  show: () => void,
  disable: () => void,
  enable: () => void,
}
 
interface Options {
  order: number | null;
  display: string | null; // defaults to id
  url: string | null; // defaults to ''
  visible: boolean | null; // defaults to true
  disabled: boolean | null; // defaults to false
  tooltip: string | null; // defaults to ''
  icon: string | null; // defaults to ''
}
```

# Notes

- The hide/show/disable/enable options were dropped with the assumption that we will be working with uiCapabilities to determine this instead... so people shouldn't need to manage it manually as they can look up a pre-filtered list of sections.
- This was updated to add flexibility for custom (non-EUI) icons as outlined in [#32661](https://github.com/elastic/kibana/issues/32661). Much like the Core Application Service, you either choose an EUI icon, or provide a URL to an icon.

# Drawbacks

- This removes the ability to infinitely nest sections within each other by making a distinction between a section header and a nav link.
  - So far we didn't seem to be using this feature anyway, but would like feedback on any use cases for it.

# Reference

- Issues about Global vs Spaces-based management sections: https://github.com/elastic/kibana/issues/37285 https://github.com/elastic/kibana/issues/37283
- Mockups related to above issues: https://marvelapp.com/52b8616/screen/57582729

# Alternatives

An alternative design would be making everything React-specific and simply requiring consumers of the service to provide a React component to render when a route is hit, or giving them a react-router instance to work with.

This would require slightly less work for folks using the service as it would eliminate the need for a `mount` function. However, it comes at the cost of forcing folks into a specific rendering framework, which ultimately provides less flexibility.

# Adoption strategy

Our strategy for implementing this should be to build the service entirely in the new platform in a `management` plugin, so that plugins can gradually cut over to the new service as they prepare to migrate to the new platform.

One thing we would need to figure out is how to bridge the gap between the new plugin and the legacy `ui/management` service. Ideally we would find a way to integrate the two, such that the management nav could display items registered via both services. This is a strategy we'd need to work out in more detail as we got closer to implementation.

# How we teach this

The hope is that this will already feel familiar to Kibana application developers, as most will have already been exposed to the Core Application Service and how it handles mounting.

A guide could also be added to the "Management" section of the Kibana docs (the legacy service is not even formally documented).
