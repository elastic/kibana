import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { uiModules } from 'ui/modules';
import { App } from '../../components/app';

export function CanvasRootController(canvasStore, $scope, $element) {
  const domNode = $element[0];

  render(
    <Provider store={canvasStore}>
      <App />
    </Provider>,
    domNode
  );

  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
}

const app = uiModules.get('apps/canvas');
app.controller('CanvasRootController', CanvasRootController);
