import ReactDOM from 'react-dom';
import React from 'react';
import { Datatable } from '../components/datatable';
import { get } from 'lodash';

export const table = {
  name: 'table',
  displayName: 'Data Table',
  help: 'Render tabluar data as HTML',
  reuseDomNode: true,
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
    ), domNode, () => handlers.done());

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
};
