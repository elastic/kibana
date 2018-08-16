import ReactDOM from 'react-dom';
import React from 'react';
import { AdvancedFilter } from './component';

export const advancedFilter = () => ({
  name: 'advanced_filter',
  displayName: 'Advanced Filter',
  help: 'Render a Canvas filter expression',
  reuseDomNode: true,
  height: 50,
  render(domNode, config, handlers) {
    ReactDOM.render(
      <AdvancedFilter commit={handlers.setFilter} filter={handlers.getFilter()} />,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => {
      handlers.setFilter('');
      ReactDOM.unmountComponentAtNode(domNode);
    });
  },
});
