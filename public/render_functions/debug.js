import ReactDOM from 'react-dom';
import React from 'react';

export const debug = {
  name: 'debug',
  displayName: 'Debug',
  help: 'Render debug output as formatted JSON',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    ReactDOM.render((
      <div style={{ overflow: 'auto', height: '100%' }}>
        <pre>{JSON.stringify(config, null, ' ')}</pre>
      </div>
    ), domNode, () => handlers.done());

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
};
