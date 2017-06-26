import { Element } from '../element';
import ReactDOM from 'react-dom';
import React from 'react';
import { Image } from 'react-bootstrap';

module.exports = new Element({
  name: 'image',
  displayName: 'Image',
  icon: null,
  expression: 'image()',
  render(domNode, config, done) {
    ReactDOM.render(<Image src={config} responsive />, domNode);
    done();
  },
});
