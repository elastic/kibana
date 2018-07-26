import ReactDOM from 'react-dom';
import React from 'react';
import { EuiCode } from '@elastic/eui';

export const debug = () => ({
  name: 'debug',
  displayName: 'Debug',
  help: 'Render debug output as formatted JSON',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const renderDebug = () => (
      <EuiCode>
        <pre style={{ overflow: 'auto', height: domNode.offsetHeight, width: domNode.offsetWidth }}>
          {JSON.stringify(config, null, 2)}
        </pre>
      </EuiCode>
    );

    ReactDOM.render(renderDebug(), domNode, () => handlers.done());

    handlers.onResize(() => {
      ReactDOM.render(renderDebug(), domNode, () => handlers.done());
    });

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
