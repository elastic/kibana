/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('ui/chrome', () => ({
  getUiSettingsClient: () => ({
    get: () => 10,
  }),
}));

jest.mock('lodash', () => ({
  debounce: (fn: any) => fn,
}));

const nextTick = () => new Promise(res => process.nextTick(res));

import {
  EuiEmptyPrompt,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPagination,
  EuiTablePagination,
} from '@elastic/eui';
import { IconType } from '@elastic/eui';
import { shallow } from 'enzyme';
import React from 'react';
import * as sinon from 'sinon';
import { SavedObjectFinder } from './saved_object_finder';

describe('SavedObjectsFinder', () => {
  let objectsClientStub: sinon.SinonStub;

  const doc = {
    id: '1',
    type: 'search',
    attributes: { title: 'Example title' },
  };

  const doc2 = {
    id: '2',
    type: 'search',
    attributes: { title: 'Another title' },
  };

  const doc3 = { type: 'vis', id: '3', attributes: { title: 'Vis' } };

  const searchMetaData = [
    {
      type: 'search',
      name: 'Search',
      getIconForSavedObject: () => 'search' as IconType,
      showSavedObject: () => true,
    },
  ];

  beforeEach(() => {
    objectsClientStub = sinon.stub();
    objectsClientStub.returns(Promise.resolve({ savedObjects: [] }));
    require('ui/chrome').getSavedObjectsClient = () => ({
      find: async (...args: any[]) => {
        return objectsClientStub(...args);
      },
    });
  });

  it('should call saved object client on startup', async () => {
    objectsClientStub.returns(Promise.resolve({ savedObjects: [doc] }));

    const wrapper = shallow(<SavedObjectFinder savedObjectMetaData={searchMetaData} />);
    wrapper.instance().componentDidMount!();
    expect(
      objectsClientStub.calledWith({
        type: ['search'],
        fields: ['title', 'visState'],
        search: undefined,
        page: 1,
        perPage: 10,
        searchFields: ['title^3', 'description'],
        defaultSearchOperator: 'AND',
      })
    ).toBe(true);
  });

  it('should list initial items', async () => {
    objectsClientStub.returns(Promise.resolve({ savedObjects: [doc] }));

    const wrapper = shallow(<SavedObjectFinder savedObjectMetaData={searchMetaData} />);
    wrapper.instance().componentDidMount!();
    await nextTick();
    expect(
      wrapper.containsMatchingElement(<EuiListGroupItem iconType="search" label="Example title" />)
    ).toEqual(true);
  });

  it('should call onChoose on item click', async () => {
    const chooseStub = sinon.stub();
    objectsClientStub.returns(Promise.resolve({ savedObjects: [doc] }));

    const wrapper = shallow(
      <SavedObjectFinder onChoose={chooseStub} savedObjectMetaData={searchMetaData} />
    );
    wrapper.instance().componentDidMount!();
    await nextTick();
    wrapper
      .find(EuiListGroupItem)
      .first()
      .simulate('click');
    expect(chooseStub.calledWith('1', 'search', `${doc.attributes.title} (Search)`)).toEqual(true);
  });

  describe('sorting', () => {
    it('should list items ascending', async () => {
      objectsClientStub.returns(Promise.resolve({ savedObjects: [doc, doc2] }));

      const wrapper = shallow(<SavedObjectFinder savedObjectMetaData={searchMetaData} />);
      wrapper.instance().componentDidMount!();
      await nextTick();
      const list = wrapper.find(EuiListGroup);
      expect(list.childAt(0).key()).toBe('2');
      expect(list.childAt(1).key()).toBe('1');
    });

    it('should list items descending', async () => {
      objectsClientStub.returns(Promise.resolve({ savedObjects: [doc, doc2] }));

      const wrapper = shallow(<SavedObjectFinder savedObjectMetaData={searchMetaData} />);
      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.setState({ sortDirection: 'desc' });
      const list = wrapper.find(EuiListGroup);
      expect(list.childAt(0).key()).toBe('1');
      expect(list.childAt(1).key()).toBe('2');
    });
  });

  it('should not show the saved objects which get filtered by showSavedObject', async () => {
    objectsClientStub.returns(Promise.resolve({ savedObjects: [doc, doc2] }));

    const wrapper = shallow(
      <SavedObjectFinder
        savedObjectMetaData={[
          {
            type: 'search',
            name: 'Search',
            getIconForSavedObject: () => 'search',
            showSavedObject: ({ id }) => id !== '1',
          },
        ]}
      />
    );
    wrapper.instance().componentDidMount!();
    await nextTick();
    const list = wrapper.find(EuiListGroup);
    expect(list.childAt(0).key()).toBe('2');
    expect(list.children().length).toBe(1);
  });

  describe('search', () => {
    it('should request filtered list on search input', async () => {
      objectsClientStub.returns(Promise.resolve({ savedObjects: [doc, doc2] }));

      const wrapper = shallow(<SavedObjectFinder savedObjectMetaData={searchMetaData} />);
      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper
        .find('[data-test-subj="savedObjectFinderSearchInput"]')
        .first()
        .simulate('change', { target: { value: 'abc' } });

      expect(
        objectsClientStub.calledWith({
          type: ['search'],
          fields: ['title', 'visState'],
          search: 'abc*',
          page: 1,
          perPage: 10,
          searchFields: ['title^3', 'description'],
          defaultSearchOperator: 'AND',
        })
      ).toBe(true);
    });

    it('should respect response order on search input', async () => {
      objectsClientStub.returns(Promise.resolve({ savedObjects: [doc, doc2] }));

      const wrapper = shallow(<SavedObjectFinder savedObjectMetaData={searchMetaData} />);
      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper
        .find('[data-test-subj="savedObjectFinderSearchInput"]')
        .first()
        .simulate('change', { target: { value: 'abc' } });
      await nextTick();
      const list = wrapper.find(EuiListGroup);
      expect(list.childAt(0).key()).toBe('1');
      expect(list.childAt(1).key()).toBe('2');
    });
  });

  it('should request multiple saved object types at once', async () => {
    const wrapper = shallow(
      <SavedObjectFinder
        savedObjectMetaData={[
          {
            type: 'search',
            name: 'Search',
            getIconForSavedObject: () => 'search',
          },
          {
            type: 'vis',
            name: 'Vis',
            getIconForSavedObject: () => 'visLine',
          },
        ]}
      />
    );
    wrapper.instance().componentDidMount!();

    expect(
      objectsClientStub.calledWith({
        type: ['search', 'vis'],
        fields: ['title', 'visState'],
        search: undefined,
        page: 1,
        perPage: 10,
        searchFields: ['title^3', 'description'],
        defaultSearchOperator: 'AND',
      })
    ).toBe(true);
  });

  describe('filter', () => {
    const metaDataConfig = [
      {
        type: 'search',
        name: 'Search',
        getIconForSavedObject: () => 'search' as IconType,
      },
      {
        type: 'vis',
        name: 'Vis',
        getIconForSavedObject: () => 'document' as IconType,
      },
    ];

    it('should not render filter buttons if disabled', async () => {
      objectsClientStub.returns(
        Promise.resolve({
          savedObjects: [doc, doc2, doc3],
        })
      );
      const wrapper = shallow(
        <SavedObjectFinder showFilter={false} savedObjectMetaData={metaDataConfig} />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.find('[data-test-subj="savedObjectFinderFilter-search"]').exists()).toBe(
        false
      );
    });

    it('should not render filter buttons if there is only one type in the list', async () => {
      objectsClientStub.returns(
        Promise.resolve({
          savedObjects: [doc, doc2],
        })
      );
      const wrapper = shallow(
        <SavedObjectFinder showFilter={true} savedObjectMetaData={metaDataConfig} />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.find('[data-test-subj="savedObjectFinderFilter-search"]').exists()).toBe(
        false
      );
    });

    it('should apply filter if selected', async () => {
      objectsClientStub.returns(
        Promise.resolve({
          savedObjects: [doc, doc2, doc3],
        })
      );
      const wrapper = shallow(
        <SavedObjectFinder showFilter={true} savedObjectMetaData={metaDataConfig} />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.setState({ filteredTypes: ['vis'] });
      const list = wrapper.find(EuiListGroup);
      expect(list.childAt(0).key()).toBe('3');
      expect(list.children().length).toBe(1);

      wrapper.setState({ filteredTypes: ['vis', 'search'] });
      expect(wrapper.find(EuiListGroup).children().length).toBe(3);
    });
  });

  it('should display no items message if there are no items', async () => {
    objectsClientStub.returns(Promise.resolve({ savedObjects: [] }));
    const noItemsMessage = <span id="myNoItemsMessage" />;
    const wrapper = shallow(
      <SavedObjectFinder noItemsMessage={noItemsMessage} savedObjectMetaData={searchMetaData} />
    );
    wrapper.instance().componentDidMount!();
    await nextTick();

    expect(
      wrapper
        .find(EuiEmptyPrompt)
        .first()
        .prop('body')
    ).toEqual(noItemsMessage);
  });

  describe('pagination', () => {
    const longItemList = new Array(50).fill(undefined).map((_, i) => ({
      id: String(i),
      type: 'search',
      attributes: {
        title: `Title ${i < 10 ? '0' : ''}${i}`,
      },
    }));

    beforeEach(() => {
      objectsClientStub.returns(Promise.resolve({ savedObjects: longItemList }));
    });

    it('should show a table pagination with initial per page', async () => {
      const wrapper = shallow(
        <SavedObjectFinder initialPageSize={15} savedObjectMetaData={searchMetaData} />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(
        wrapper
          .find(EuiTablePagination)
          .first()
          .prop('itemsPerPage')
      ).toEqual(15);
      expect(wrapper.find(EuiListGroup).children().length).toBe(15);
    });

    it('should allow switching the page size', async () => {
      const wrapper = shallow(
        <SavedObjectFinder initialPageSize={15} savedObjectMetaData={searchMetaData} />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper
        .find(EuiTablePagination)
        .first()
        .prop('onChangeItemsPerPage')!(5);
      expect(wrapper.find(EuiListGroup).children().length).toBe(5);
    });

    it('should switch page correctly', async () => {
      const wrapper = shallow(
        <SavedObjectFinder initialPageSize={15} savedObjectMetaData={searchMetaData} />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper
        .find(EuiTablePagination)
        .first()
        .prop('onChangePage')!(1);
      expect(
        wrapper
          .find(EuiListGroup)
          .children()
          .first()
          .key()
      ).toBe('15');
    });

    it('should show an ordinary pagination for fixed page sizes', async () => {
      const wrapper = shallow(
        <SavedObjectFinder fixedPageSize={33} savedObjectMetaData={searchMetaData} />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(
        wrapper
          .find(EuiPagination)
          .first()
          .prop('pageCount')
      ).toEqual(2);
      expect(wrapper.find(EuiListGroup).children().length).toBe(33);
    });

    it('should switch page correctly for fixed page sizes', async () => {
      const wrapper = shallow(
        <SavedObjectFinder fixedPageSize={33} savedObjectMetaData={searchMetaData} />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper
        .find(EuiPagination)
        .first()
        .prop('onPageClick')!(1);
      expect(
        wrapper
          .find(EuiListGroup)
          .children()
          .first()
          .key()
      ).toBe('33');
    });
  });

  describe('loading state', () => {
    it('should display a spinner during initial loading', () => {
      const wrapper = shallow(<SavedObjectFinder savedObjectMetaData={searchMetaData} />);

      expect(wrapper.containsMatchingElement(<EuiLoadingSpinner />)).toBe(true);
    });

    it('should hide the spinner if data is shown', async () => {
      objectsClientStub.returns(Promise.resolve({ savedObjects: [doc] }));

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjectMetaData={[
            {
              type: 'search',
              name: 'Search',
              getIconForSavedObject: () => 'search',
            },
          ]}
        />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.containsMatchingElement(<EuiLoadingSpinner />)).toBe(false);
    });

    it('should not show the spinner if there are already items', async () => {
      objectsClientStub.returns(Promise.resolve({ savedObjects: [doc] }));

      const wrapper = shallow(<SavedObjectFinder savedObjectMetaData={searchMetaData} />);
      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper
        .find('[data-test-subj="savedObjectFinderSearchInput"]')
        .first()
        .simulate('change', { target: { value: 'abc' } });

      wrapper.update();

      expect(wrapper.containsMatchingElement(<EuiLoadingSpinner />)).toBe(false);
    });
  });
});
