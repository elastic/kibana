/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0 and the Server Side Public License, v 1; you may not use this file except
//  * in compliance with, at your election, the Elastic License 2.0 or the Server
//  * Side Public License, v 1.
//  */

// import React, { useMemo } from 'react';
// import ReactDOM from 'react-dom';
// import { BrowserRouter as Router, Route } from 'react-router-dom';
// import { EuiSideNav } from '@elastic/eui';
// import { AppMountParameters, CoreStart } from '../../../src/core/public';
// import { AlertsDemoClientStartDeps } from './types';
// import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';
// import { createKibanaContextForPlugin } from './hooks/use_kibana';
// import { KibanaPageTemplate } from '../../../src/plugins/kibana_react/public';
// import { TriggersAndActionsUIPublicPluginStart } from '../../../x-pack/plugins/triggers_actions_ui/public';

// export const CoreProviders: React.FC<{
//   core: CoreStart;
//   plugins: AlertsDemoClientStartDeps;
// }> = ({ children, core, plugins }) => {
//   const { Provider: KibanaContextProviderForPlugin } = useMemo(
//     () => createKibanaContextForPlugin(core, plugins),
//     [core, plugins]
//   );

//   return (
//     <KibanaContextProviderForPlugin services={{ ...core, ...plugins }}>
//       <core.i18n.Context>{children}</core.i18n.Context>
//     </KibanaContextProviderForPlugin>
//   );
// };

// function AlertsDemoPageTemplate({ children, ...rest }) {
//   {
//     /* <PageTemplate
//       data-test-subj="logsLogEntryCategoriesPage"
//       pageHeader={{
//         pageTitle: 'Alerts Demo Title',
//       }}
//       {...rest}
//     >
//       {children}
//     </PageTemplate>
//     */
//   }
//   const items = [
//     {
//       name: 'Section1',
//       id: 'home',
//       items: [
//         {
//           name: 'nav item1',
//         },
//         {
//           name: 'nav item2',
//         },
//       ],
//     },
//     {
//       name: 'Section2',
//       id: 'about',
//       items: [
//         {
//           name: 'nav item1',
//         },
//         {
//           name: 'nav item2',
//         },
//       ],
//     },
//   ];
//   const sideNav = <EuiSideNav heading="Sidebar" items={items} />;
//   return <KibanaPageTemplate pageSideBar={sideNav}>{children}</KibanaPageTemplate>;
// }

// export const renderApp = (
//   core: CoreStart,
//   plugins: AlertsDemoClientStartDeps,
//   { appBasePath, element }: AppMountParameters
// ) => {
//   ReactDOM.render(
//     <AlertsDemoApp
//       core={core}
//       basename={appBasePath}
//       notifications={core.notifications}
//       http={core.http}
//       navigation={plugins.navigation}
//       plugins={plugins}
//       triggersActionsUI={plugins.triggersActionsUi}
//     />,
//     element
//   );

//   return () => ReactDOM.unmountComponentAtNode(element);
// };

// interface AlertsDemoAppDeps {
//   basename: string;
//   notifications: CoreStart['notifications'];
//   http: CoreStart['http'];
//   navigation: NavigationPublicPluginStart;
//   plugins: AlertsDemoClientStartDeps;
// }

// const AlertsDemoApp: React.FC<{
//   basename: string;
//   notifications: CoreStart['notifications'];
//   http: CoreStart['http'];
//   navigation: NavigationPublicPluginStart;
//   plugins: AlertsDemoClientStartDeps;
//   core: CoreStart;
//   triggersActionsUI: TriggersAndActionsUIPublicPluginStart;
// }> = ({ basename, notifications, http, navigation, plugins, core }) => {
//   return (
//     /* <CoreProviders core={core} plugins={plugins}>
//       <AlertsDemoPageTemplate>
//         <Router basename={basename}>
//           <Route
//             path="app/aalertsDemo"
//             component={() => {
//               return <h1>sdsdsd</h1>;
//             }}
//           />
//         </Router>
//       </AlertsDemoPageTemplate>
//           </CoreProviders> */
//     <AlertsDemoPageTemplate>
//       <h1>Finally</h1>
//     </AlertsDemoPageTemplate>
//   );
// };
