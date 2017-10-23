import ReactDOM from 'react-dom';
import React from 'react';
import header from './header.png';
import { TimeFilter } from './components/time_filter';
import { fromExpression, toExpression } from '../../../common/lib/ast';
import { get, set } from 'lodash';

export default {
  name: 'time_filter',
  displayName: 'Time Filter',
  description: 'Set a time window',
  image: header,
  expression: 'timefilterControl compact=true column=@timestamp | render as=time_filter',
  filter: 'timefilter column=@timestamp from=now-6M to=now-2M',
  render(domNode, config, handlers) {
    const ast = fromExpression(handlers.getFilter());

    // Check if the current column is what we expect it to be. If the user changes column this will be called again,
    // but we don't want to run setFilter() unless we have to because it will cause a data refresh
    const column = get(ast, 'chain[0].arguments.column[0]');
    if (column !== config.column) {
      set(ast, 'chain[0].arguments.column[0]', config.column);
      handlers.setFilter(toExpression(ast));
    }

    ReactDOM.render((<TimeFilter compact={config.compact} commit={handlers.setFilter} filter={toExpression(ast)}/>), domNode);
    handlers.done();
  },
};
