import ReactDOM from 'react-dom';
import React from 'react';
import { get } from 'lodash';
import { fromExpression, toExpression } from '../../../common/lib/ast';
import { DropdownFilter } from './component';

export const dropdownFilter = () => ({
  name: 'dropdown_filter',
  displayName: 'Dropdown Filter',
  help: 'A dropdown from which you can select values for an "exactly" filter',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    let value = '%%CANVAS_MATCH_ALL%%';
    if (handlers.getFilter() !== '') {
      const filterAST = fromExpression(handlers.getFilter());
      value = get(filterAST, 'chain[0].arguments.value[0]');
    }

    //const filter = handlers.getFilter();
    const commit = value => {
      if (value === '%%CANVAS_MATCH_ALL%%') {
        handlers.setFilter('');
      } else {
        console.log(config);
        const newFilterAST = {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'exactly',
              arguments: {
                value: [value],
                column: [config.column],
              },
            },
          ],
        };

        const filter = toExpression(newFilterAST);
        handlers.setFilter(filter);
      }
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
