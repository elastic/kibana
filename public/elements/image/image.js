import { Element } from '../element';
import ReactDOM from 'react-dom';
import React from 'react';

module.exports = new Element({
  name: 'image',
  displayName: 'Image',
  icon: null,
  expression: 'image()',
  render(domNode, config, done) {
    ReactDOM.render(<div style={{
      height: '100%',
      backgroundImage: `url(${config.dataurl})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundSize: 'contain',
    }} />, domNode);
    done();
  },
});
