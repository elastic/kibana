import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppPluginStartDependencies } from './types';
import { WorkflowsApp } from './components/app';

const queryClient = new QueryClient();

export const renderApp = (
  coreStart: CoreStart,
  depsStart: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaContextProvider services={{ ...coreStart, ...depsStart }}>
      <QueryClientProvider client={queryClient}>
        <WorkflowsApp
          basename={appBasePath}
          notifications={coreStart.notifications}
          http={coreStart.http}
          navigation={depsStart.navigation}
        />
      </QueryClientProvider>
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
