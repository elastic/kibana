import ReactDOM from 'react-dom';
import React from 'react';

export const text = () => ({
  name: 'text',
  displayName: 'Plain Text',
  help: 'Render output as plain text',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    ReactDOM.render(<div>{config}</div>, domNode, () => handlers.done());
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
