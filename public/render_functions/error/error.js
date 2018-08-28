import ReactDOM from 'react-dom';
import React from 'react';
import { Error } from '../../components/error';

export const error = () => ({
  name: 'error',
  displayName: 'Error Information',
  help: 'Render error data in a way that is helpful to users',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    ReactDOM.render(
      <div className="canvas_error-render">
        <Error payload={config} />
      </div>,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
