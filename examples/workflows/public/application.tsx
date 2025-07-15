import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { AppPluginStartDependencies } from './types';
import { WorkflowsApp } from './components/app';

export const renderApp = (
  coreStart: CoreStart,
  depsStart: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaContextProvider services={{ ...coreStart, ...depsStart }}>
      <WorkflowsApp
        basename={appBasePath}
        notifications={coreStart.notifications}
        http={coreStart.http}
        navigation={depsStart.navigation}
      />
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
