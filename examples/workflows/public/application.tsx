import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppPluginStartDependencies } from './types';
import { WorkflowsApp } from './components/app';

const queryClient = new QueryClient();

export const renderApp = (
  { notifications, http, chrome, application }: CoreStart,
  { navigation }: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaContextProvider services={{ notifications, http, chrome, application }}>
      <QueryClientProvider client={queryClient}>
        <WorkflowsApp
          basename={appBasePath}
          notifications={notifications}
          http={http}
          navigation={navigation}
        />
      </QueryClientProvider>
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
