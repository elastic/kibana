import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '<%= relRoot %>/src/core/public';
import { AppPluginStartDependencies } from './types';
import { <%= upperCamelCaseName %>App } from './components/app';


export const renderApp = (
    { notifications, http }: CoreStart,
    { navigation }: AppPluginStartDependencies,
    { appBasePath, element }: AppMountParameters
  ) => {
    ReactDOM.render(
      <<%= upperCamelCaseName %>App
        basename={appBasePath}
        notifications={notifications}
        http={http}
        navigation={navigation}
      />,
      element
    );
  
    return () => ReactDOM.unmountComponentAtNode(element);
  };
  