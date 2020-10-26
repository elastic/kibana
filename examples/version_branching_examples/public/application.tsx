import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { AppPluginStartDependencies } from './types';
import { VersionBranchingExamplesApp } from './components/app';

export const renderApp = (
  { notifications, http, version }: CoreStart,
  { navigation }: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <VersionBranchingExamplesApp
      basename={appBasePath}
      notifications={notifications}
      http={http}
      navigation={navigation}
      version={version}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
