import ReactDOM from 'react-dom';
import React from 'react';
import header from './header.png';

export const image = {
  name: 'image',
  displayName: 'Image',
  help: 'A static image.',
  image: header,
  expression: 'image mode="contain" | render',
  render(domNode, config, handlers) {
    ReactDOM.render(<div style={{
      height: '100%',
      backgroundImage: `url(${config.dataurl})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundSize: config.mode,
    }} />, domNode);
    handlers.done();
  },
};
