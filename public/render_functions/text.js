import ReactDOM from 'react-dom';
import React from 'react';

export const text = () => ({
  name: 'text',
  displayName: 'Plain Text',
  help: 'Render output as plain text',
  reuseDomNode: true,
  render(domNode, { text }, handlers) {
    ReactDOM.render(<div>{text}</div>, domNode, () => handlers.done());
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
