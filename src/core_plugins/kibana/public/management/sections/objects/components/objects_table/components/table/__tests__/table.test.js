import React from 'react';
import { shallow } from 'enzyme';

jest.mock('ui/errors', () => ({
  SavedObjectNotFound: class SavedObjectNotFound extends Error {
    constructor(options) {
      super();
      for (const option in options) {
        if (options.hasOwnProperty(option)) {
          this[option] = options[option];
        }
      }
    }
  },
}));

jest.mock('ui/chrome', () => ({
  addBasePath: () => ''
}));

import { Table } from '../table';

describe('Table', () => {
  it('should render normally', () => {
    const props = {
      selectedSavedObjects: [1],
      selectionConfig: {
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
      itemId: 'id',
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
