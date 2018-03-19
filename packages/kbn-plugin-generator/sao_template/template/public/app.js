import React from "react";
import moment from "moment";
import { uiModules } from "ui/modules";
import chrome from "ui/chrome";
import uiRoutes from "ui/routes";
import { render, unmountComponentAtNode } from "react-dom";

import "ui/autoload/styles";
import "./less/main.less";
import template from "./templates/index.html";
import { Main } from "./components/main";

const app = uiModules.get("apps/<%= kebabCase(name) %>");

app.config($locationProvider => {
  $locationProvider.html5Mode({
    enabled: false,
    requireBase: false,
    rewriteLinks: false,
  });
});

function RootController($scope, $element, $http) {
  const domNode = $element[0];

  // render react to DOM
  render(<Main title={"<%= name %>"} httpClient={$http}/>, domNode);

  // unmount react on controller destroy
  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
}

chrome.setRootController("<%= kebabCase(name) %>", RootController);
