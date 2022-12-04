import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '../../../core/public';
import { AppPluginStartDependencies } from './types';
import { ContentApp } from './components/app';
import type { ContentRegistry } from './service/registry/content_registry';

export const renderApp = (
  { notifications, http }: CoreStart,
  { }: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters,
  registry: ContentRegistry,
) => {
  ReactDOM.render(
    <ContentApp
      basename={appBasePath}
      notifications={notifications}
      http={http}
      registry={registry}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
