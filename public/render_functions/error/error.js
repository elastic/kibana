import ReactDOM from 'react-dom';
import React from 'react';
import { Alert } from 'react-bootstrap';
import { get } from 'lodash';
import { ShowDebugging } from './show_debugging';
import './error.less';

export const error = {
  name: 'error',
  displayName: 'Error Information',
  help: 'Render error data in a way that is helpful to users',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const functionName = get(config, 'info.functionName');
    const message = get(config, 'error.message');

    ReactDOM.render((
      <div className="canvas_error-render">
        <Alert bsStyle="danger">
          <h4>Whoops! Expression failed.</h4>

          <p>
            The function <strong>"{functionName}"</strong> failed
            {message ? ' with the following message:' : '.'}
          </p>
          {message && (
            <p style={{ padding: '0 16px' }}>{message}</p>
          )}

          <ShowDebugging payload={config} />
        </Alert>
      </div>
    ), domNode, () => handlers.done());

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
};
