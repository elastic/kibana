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

const app = uiModules.get("apps/<%= name %>");
app.config(stateManagementConfigProvider => {
  stateManagementConfigProvider.disable();
});
const controller = ($scope, $route, $interval) => {
  const elem = document.getElementById("pluginReactRoot");
  let currentTime = moment($route.current.locals.currentTime);
  const props = {
    title: "<%= this.startCase(name) %>",
    description: "<%= description %>",
    currentTime: currentTime.format("HH:mm:ss")
  };
  render(<Main {...props} />, elem);
  const stop = $interval(function() {
    currentTime = currentTime.add(1, "second");
    render(<Main {...props} currentTime={currentTime.format("HH:mm:ss")} />, elem);
  }, 1000);
  $scope.$watch("$destroy", () => {
    $interval.cancel(stop);
    elem && unmountComponentAtNode(elem);
  });
};
const controllerName = "<%= this.camelCase(name) %>HelloWorld";
app.controller(controllerName, controller);
uiRoutes.enable();
uiRoutes.when("/", {
  template,
  controller,
  resolve: {
    currentTime($http) {
      return $http.get("../api/<%= name %>/example").then(function(resp) {
        return resp.data.time;
      });
    }
  }
});
