import { Element } from '../element';
import ReactDOM from 'react-dom';
import React from 'react';
import { Datatable } from '../../components/datatable';
import header from './header.png';

module.exports = new Element('table', {
  displayName: 'Data Table',
  description: 'A scrollable grid for displaying data in a tabluar format',
  image: header,
  expression: 'demodata().render()',
  render(domNode, config, done) {
    ReactDOM.render((<Datatable datatable={config}/>), domNode);
    done();
  },
});
