import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';


const app = require('ui/modules').get('apps/canvas');
app.directive('react', ($store) => {
  return {
    restrict: 'E',
    scope: {
      component: '='
    },
    link: ($scope, $el) => {
      const Component = $scope.component;
      render(
          <Provider store={$store}>
            <Component/>
          </Provider>
      , $el[0]);
      $scope.$on('$destroy', () => {
        unmountComponentAtNode($el[0]);
      });
    }
  };
});
