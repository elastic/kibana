import ReactDOM from 'react-dom';
import React from 'react';

export const image = {
  name: 'image',
  displayName: 'Image',
  help: 'Render an image',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const style = {
      height: '100%',
      backgroundImage: `url(${config.dataurl})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundSize: config.mode,
    };

    ReactDOM.render((
      <div style={style} />
    ), domNode, () => handlers.done());

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));

    handlers.done();
  },
};
