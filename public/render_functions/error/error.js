import ReactDOM from 'react-dom';
import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { get } from 'lodash';
import { ShowDebugging } from './show_debugging';

export const error = () => ({
  name: 'error',
  displayName: 'Error Information',
  help: 'Render error data in a way that is helpful to users',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const functionName = get(config, 'info.functionName');
    const message = get(config, 'error.message');

    ReactDOM.render(
      <div className="canvas_error-render">
        <EuiCallOut color="danger" iconType="cross" title="Whoops! Expression failed">
          <p>
            The function <strong>"{functionName}"</strong> failed
            {message ? ' with the following message:' : '.'}
          </p>
          {message && <p style={{ padding: '0 16px' }}>{message}</p>}

          <ShowDebugging payload={config} />
        </EuiCallOut>
      </div>,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
