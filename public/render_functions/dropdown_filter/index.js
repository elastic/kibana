import ReactDOM from 'react-dom';
import React from 'react';
import { get, set } from 'lodash';
import { fromExpression, toExpression } from '../../../common/lib/ast';
import { DropdownFilter } from './component';

export const dropdownFilter = () => ({
  name: 'dropdown_filter',
  displayName: 'Dropdown Filter',
  help: 'A dropdown from which you can select values for an "exactly" filter',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    function getFilterProperties() {
      const filterAST = fromExpression(handlers.getFilter());
      const value = get(filterAST, 'chain[0].arguments.value[0]');
      const column = get(filterAST, 'chain[0].arguments.column[0]');
      return { value, column };
    }

    console.log(config);

    const filterAST = fromExpression(handlers.getFilter());
    const { value, column } = getFilterProperties();

    // Check if the current column is what we expect it to be. If the user changes column this will be called again,
    // but we don't want to run setFilter() unless we have to because it will cause a data refresh
    if (column !== config.column) {
      console.log(column, config.column);
      set(filterAST, 'chain[0].arguments.column[0]', config.column);
      handlers.setFilter(toExpression(filterAST));
    }

    //const filter = handlers.getFilter();
    const commit = value => {
      const { column } = getFilterProperties();
      const newFilterAST = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'exactly',
            arguments: {
              value: [value],
              column: [column],
            },
          },
        ],
      };

      const filter = toExpression(newFilterAST);
      handlers.setFilter(filter);
    };

    // Get choices
    const choices = config.choices;

    ReactDOM.render(
      <DropdownFilter commit={commit} choices={choices || []} value={value} />,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
