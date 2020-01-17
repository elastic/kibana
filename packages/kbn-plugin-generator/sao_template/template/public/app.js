import React from 'react';
import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';
import { render, unmountComponentAtNode } from 'react-dom';
<%_ if (generateTranslations) { _%>
import { I18nProvider } from '@kbn/i18n/react';
<%_ } _%>

import { Main } from './components/main';

const app = uiModules.get('apps/<%= camelCase(name) %>');

app.config($locationProvider => {
  $locationProvider.html5Mode({
    enabled: false,
    requireBase: false,
    rewriteLinks: false,
  });
});
app.config(stateManagementConfigProvider =>
  stateManagementConfigProvider.disable()
);

function RootController($scope, $element, $http) {
  const domNode = $element[0];

  // render react to DOM
  <%_ if (generateTranslations) { _%>
  render(
    <I18nProvider>
      <Main title="<%= name %>" httpClient={$http} />
    </I18nProvider>,
    domNode
  );
  <%_ } else { _%>
  render(<Main title="<%= name %>" httpClient={$http} />, domNode);
  <%_ } _%>

  // unmount react on controller destroy
  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
}

chrome.setRootController('<%= camelCase(name) %>', RootController);
