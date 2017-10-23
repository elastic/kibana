import ReactDOM from 'react-dom';
import React from 'react';
import { Datatable } from '../../components/datatable';
import header from './header.png';
import { get } from 'lodash';

export default {
  name: 'table',
  displayName: 'Data Table',
  description: 'A scrollable grid for displaying data in a tabluar format',
  image: header,
  expression: 'filters | demodata | table | render',
  render(domNode, config, handlers) {
    const { datatable, paginate, perPage, font } = config;
    ReactDOM.render((
      <div style={{
        ...get(font, 'spec'),
        height: '100%',
      }}>
        <Datatable
          datatable={datatable}
          perPage={perPage}
          paginate={paginate}
        />
      </div>
    ), domNode);
    handlers.done();
  },
};
