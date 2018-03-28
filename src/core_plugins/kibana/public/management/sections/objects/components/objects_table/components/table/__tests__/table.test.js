import React from 'react';
import { shallow } from 'enzyme';

import { Table } from '../table';

describe('Table', () => {
  it('should render normally', () => {
    const props = {
      selectedSavedObjects: [1],
      selectionConfig: {
        itemId: 'id',
        onSelectionChange: () => {},
      },
      filterOptions: [2],
      onDelete: () => {},
      onExport: () => {},
      getEditUrl: () => {},
      goInApp: () => {},

      pageIndex: 1,
      pageSize: 2,
      items: [3],
      totalItemCount: 3,
      onQueryChange: () => {},
      onTableChange: () => {},
      isSearching: false,

      onShowRelationships: () => {},
    };

    const component = shallow(
      <Table
        {...props}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
