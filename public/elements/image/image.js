import { Element } from '../element';
import ReactDOM from 'react-dom';
import React from 'react';
import header from './header.png';

module.exports = new Element({
  name: 'image',
  displayName: 'Image',
  description: 'A static image.',
  image: header,
  expression: 'image(mode="contain")',
  render(domNode, config, done) {
    ReactDOM.render(<div style={{
      height: '100%',
      backgroundImage: `url(${config.dataurl})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundSize: config.mode,
    }} />, domNode);
    done();
  },
});
