import ReactDOM from 'react-dom';
import React from 'react';
import header from './header.png';
import { AdvancedFilter } from './components/advanced_filter';

export default {
  name: 'advanced_filter',
  displayName: 'Advanced Filter',
  description: 'An input box for typing a Canvas filter expression',
  image: header,
  expression: 'render as=advanced_filter',
  render(domNode, config, handlers) {
    ReactDOM.render((<AdvancedFilter commit={handlers.setFilter} filter={handlers.getFilter()}/>), domNode);
    handlers.done();
  },
};
