import React from 'react';
import ReactDom from 'react-dom';

export const templateFromReactComponent = Component => {
  return async (domNode, config, handlers) => {
    try {
      ReactDom.render(React.createElement(Component, config), domNode);
      handlers.done();
    } catch (e) {
      config.renderError();
    }

    handlers.onDestroy(() => {
      ReactDom.unmountComponentAtNode(domNode);
    });
  };
};
