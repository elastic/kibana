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

// import React, { useState } from 'react';
// import { i18n } from '@kbn/i18n';
// import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
// import { BrowserRouter as Router } from 'react-router-dom';
// import {
//   EuiButton,
//   EuiHorizontalRule,
//   EuiPage,
//   EuiPageBody,
//   EuiPageContent,
//   EuiPageContentBody,
//   EuiPageContentHeader,
//   EuiPageHeader,
//   EuiTitle,
//   EuiText,
// } from '@elastic/eui';
// import { PageTemplate } from './page_template';
// import { AlertsDemoClientStartDeps } from '../types';

// import type { LazyObservabilityPageTemplateProps } from '../../../../x-pack/plugins/observability/public';

// import { CoreStart } from '../../../../src/core/public';
// import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

// import { PLUGIN_ID, PLUGIN_NAME } from '../../common';

// interface AlertsDemoAppDeps {
//   basename: string;
//   notifications: CoreStart['notifications'];
//   http: CoreStart['http'];
//   navigation: NavigationPublicPluginStart;
//   plugins: AlertsDemoClientStartDeps;
// }

// export const AlertsDemoApp = ({ basename, notifications, http, navigation }: AlertsDemoAppDeps) => {
//   function AlertsDemoPageTemplate({ children, ...rest }) {
//     console.log(AlertsDemoPageTemplate, '!!!aaa');
//     return (
//       <PageTemplate
//         data-test-subj="logsLogEntryCategoriesPage"
//         pageHeader={{
//           pageTitle: 'Alerts Demo Title',
//         }}
//         {...rest}
//       >
//         {children}
//       </PageTemplate>
//     );
//   }
//   // Use React hooks to manage state.
//   const [timestamp, setTimestamp] = useState<string | undefined>();

//   const onClickHandler = () => {
//     // Use the core http service to make a response to the server API.
//     http.get('/api/alerts_demo/example').then((res) => {
//       setTimestamp(res.time);
//       // Use the core notifications service to display a success message.
//       notifications.toasts.addSuccess(
//         i18n.translate('alertsDemo.dataUpdated', {
//           defaultMessage: 'Data updated',
//         })
//       );
//     });
//   };

//   // Render the application DOM.
//   // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
//   return (
//     <AlertsDemoPageTemplate>
//       <h1>Demp</h1>
//       {/* <Router basename={basename}>
//         <I18nProvider>
//           <>
//             <navigation.ui.TopNavMenu
//               appName={PLUGIN_ID}
//               showSearchBar={true}
//               useDefaultBehaviors={true}
//             />
//             <EuiPage restrictWidth="1000px">
//               <EuiPageBody>
//                 <EuiPageHeader>
//                   <EuiTitle size="l">
//                     <h1>
//                       <FormattedMessage
//                         id="alertsDemo.helloWorldText"
//                         defaultMessage="{name}"
//                         values={{ name: PLUGIN_NAME }}
//                       />
//                     </h1>
//                   </EuiTitle>
//                 </EuiPageHeader>
//                 <EuiPageContent>
//                   <EuiPageContentHeader>
//                     <EuiTitle>
//                       <h2>
//                         <FormattedMessage
//                           id="alertsDemo.congratulationsTitle"
//                           defaultMessage="Congratulations, you have successfully created a new Kibana Plugin!"
//                         />
//                       </h2>
//                     </EuiTitle>
//                   </EuiPageContentHeader>
//                   <EuiPageContentBody>
//                     <EuiText>
//                       <p>
//                         <FormattedMessage
//                           id="alertsDemo.content"
//                           defaultMessage="Look through the generated code and check out the plugin development documentation."
//                         />
//                       </p>
//                       <EuiHorizontalRule />
//                       <p>
//                         <FormattedMessage
//                           id="alertsDemo.timestampText"
//                           defaultMessage="Last timestamp: {time}"
//                           values={{ time: timestamp ? timestamp : 'Unknown' }}
//                         />
//                       </p>
//                       <EuiButton type="primary" size="s" onClick={onClickHandler}>
//                         <FormattedMessage id="alertsDemo.buttonText" defaultMessage="Get data" />
//                       </EuiButton>
//                     </EuiText>
//                   </EuiPageContentBody>
//                 </EuiPageContent>
//               </EuiPageBody>
//             </EuiPage>
//           </>
//         </I18nProvider>
//       </Router> */}
//     </AlertsDemoPageTemplate>
//   );
// };
