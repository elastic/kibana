import ReactDOM from 'react-dom';
import React from 'react';
import header from './header.png';

export default {
  name: 'debug',
  displayName: 'Debug',
  description: 'Just dumps the configuration of the element',
  image: header,
  expression: 'demodata | render as=debug',
  render(domNode, config, handlers) {
    ReactDOM.render(
      <div style={{ overflow: 'auto', height: '100%' }}>
        <pre>{JSON.stringify(config, null, ' ')}</pre>
      </div>, domNode);
    handlers.done();
  },
};
