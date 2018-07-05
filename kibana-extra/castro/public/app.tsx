import React from 'react';
import { Provider } from 'react-redux'
import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';
import { render, unmountComponentAtNode } from 'react-dom';

import 'ui/autoload/styles';
import './less/main.less';
import App from './components/App';
import store from './stores';

const app = uiModules.get("apps/castro");

console.log("");

app.config(($locationProvider: any) => {
  $locationProvider.html5Mode({
    enabled: false,
    requireBase: false,
    rewriteLinks: false,
  });
});
app.config((stateManagementConfigProvider: any) =>
  stateManagementConfigProvider.disable()
);

function RootController($scope: any, $element: any, $http: any) {
  const domNode = $element[0];

  // render react to DOM
  render(
    <Provider store={store}>
      <App title="castro" httpClient={$http} />
    </Provider>,
    domNode
  );

  // unmount react on controller destroy
  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
}

chrome.setRootController("castro", RootController);
