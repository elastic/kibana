/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('lodash', () => ({
  debounce: (fn: any) => fn,
}));

const nextTick = () => new Promise((res) => process.nextTick(res));

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
import { SavedObjectFinderUi as SavedObjectFinder } from './saved_object_finder';
import { coreMock } from '../../../../core/public/mocks';

describe('SavedObjectsFinder', () => {
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

  it('should call saved object client on startup', async () => {
    const core = coreMock.createStart();
    (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ savedObjects: [doc] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const wrapper = shallow(
      <SavedObjectFinder
        savedObjects={core.savedObjects}
        uiSettings={core.uiSettings}
        savedObjectMetaData={searchMetaData}
      />
    );
    wrapper.instance().componentDidMount!();

    expect(core.savedObjects.client.find).toHaveBeenCalledWith({
      type: ['search'],
      fields: ['title', 'name'],
      search: undefined,
      page: 1,
      perPage: 10,
      searchFields: ['title^3', 'description'],
      defaultSearchOperator: 'AND',
    });
  });

  it('should list initial items', async () => {
    const core = coreMock.createStart();
    (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ savedObjects: [doc] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const wrapper = shallow(
      <SavedObjectFinder
        savedObjects={core.savedObjects}
        uiSettings={core.uiSettings}
        savedObjectMetaData={searchMetaData}
      />
    );

    wrapper.instance().componentDidMount!();
    await nextTick();
    expect(
      wrapper.containsMatchingElement(<EuiListGroupItem iconType="search" label="Example title" />)
    ).toEqual(true);
  });

  it('should call onChoose on item click', async () => {
    const chooseStub = sinon.stub();
    const core = coreMock.createStart();
    (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ savedObjects: [doc] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const wrapper = shallow(
      <SavedObjectFinder
        savedObjects={core.savedObjects}
        uiSettings={core.uiSettings}
        onChoose={chooseStub}
        savedObjectMetaData={searchMetaData}
      />
    );

    wrapper.instance().componentDidMount!();
    await nextTick();
    wrapper.find(EuiListGroupItem).first().simulate('click');
    expect(chooseStub.calledWith('1', 'search', `${doc.attributes.title} (Search)`, doc)).toEqual(
      true
    );
  });

  describe('sorting', () => {
    it('should list items ascending', async () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ savedObjects: [doc, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          savedObjectMetaData={searchMetaData}
        />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      const list = wrapper.find(EuiListGroup);
      expect(list.childAt(0).key()).toBe('2');
      expect(list.childAt(1).key()).toBe('1');
    });

    it('should list items descending', async () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ savedObjects: [doc, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.setState({ sortDirection: 'desc' });
      const list = wrapper.find(EuiListGroup);
      expect(list.childAt(0).key()).toBe('1');
      expect(list.childAt(1).key()).toBe('2');
    });
  });

  it('should not show the saved objects which get filtered by showSavedObject', async () => {
    const core = coreMock.createStart();
    (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ savedObjects: [doc, doc2] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const wrapper = shallow(
      <SavedObjectFinder
        savedObjects={core.savedObjects}
        uiSettings={core.uiSettings}
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
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ savedObjects: [doc, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          savedObjectMetaData={searchMetaData}
        />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper
        .find('[data-test-subj="savedObjectFinderSearchInput"]')
        .first()
        .simulate('change', { target: { value: 'abc' } });

      expect(core.savedObjects.client.find).toHaveBeenCalledWith({
        type: ['search'],
        fields: ['title', 'name'],
        search: 'abc*',
        page: 1,
        perPage: 10,
        searchFields: ['title^3', 'description'],
        defaultSearchOperator: 'AND',
      });
    });

    it('should include additional fields in search if listed in meta data', async () => {
      const core = coreMock.createStart();
      core.uiSettings.get.mockImplementation(() => 10);
      (core.savedObjects.client.find as jest.Mock).mockResolvedValue({ savedObjects: [] });

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          savedObjectMetaData={[
            {
              type: 'type1',
              name: '',
              getIconForSavedObject: () => 'search',
              includeFields: ['field1', 'field2'],
            },
            {
              type: 'type2',
              name: '',
              getIconForSavedObject: () => 'search',
              includeFields: ['field2', 'field3'],
            },
          ]}
        />
      );
      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper
        .find('[data-test-subj="savedObjectFinderSearchInput"]')
        .first()
        .simulate('change', { target: { value: 'abc' } });

      expect(core.savedObjects.client.find).toHaveBeenCalledWith({
        type: ['type1', 'type2'],
        fields: ['title', 'name', 'field1', 'field2', 'field3'],
        search: 'abc*',
        page: 1,
        perPage: 10,
        searchFields: ['title^3', 'description'],
        defaultSearchOperator: 'AND',
      });
    });

    it('should respect response order on search input', async () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ savedObjects: [doc, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          savedObjectMetaData={searchMetaData}
        />
      );

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
    const core = coreMock.createStart();
    (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ savedObjects: [doc, doc2] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const wrapper = shallow(
      <SavedObjectFinder
        savedObjects={core.savedObjects}
        uiSettings={core.uiSettings}
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

    expect(core.savedObjects.client.find).toHaveBeenCalledWith({
      type: ['search', 'vis'],
      fields: ['title', 'name'],
      search: undefined,
      page: 1,
      perPage: 10,
      searchFields: ['title^3', 'description'],
      defaultSearchOperator: 'AND',
    });
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
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({
          savedObjects: [doc, doc2, doc3],
        })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          showFilter={false}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.find('[data-test-subj="savedObjectFinderFilter-search"]').exists()).toBe(
        false
      );
    });

    it('should not render filter buttons if there is only one type in the list', async () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({
          savedObjects: [doc, doc2],
        })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          showFilter={true}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.find('[data-test-subj="savedObjectFinderFilter-search"]').exists()).toBe(
        false
      );
    });

    it('should apply filter if selected', async () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({
          savedObjects: [doc, doc2, doc3],
        })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          showFilter={true}
          savedObjectMetaData={metaDataConfig}
        />
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
    const core = coreMock.createStart();
    (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ savedObjects: [] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const noItemsMessage = <span id="myNoItemsMessage" />;
    const wrapper = shallow(
      <SavedObjectFinder
        savedObjects={core.savedObjects}
        uiSettings={core.uiSettings}
        noItemsMessage={noItemsMessage}
        savedObjectMetaData={searchMetaData}
      />
    );
    wrapper.instance().componentDidMount!();
    await nextTick();

    expect(wrapper.find(EuiEmptyPrompt).first().prop('body')).toEqual(noItemsMessage);
  });

  describe('pagination', () => {
    const longItemList = new Array(50).fill(undefined).map((_, i) => ({
      id: String(i),
      type: 'search',
      attributes: {
        title: `Title ${i < 10 ? '0' : ''}${i}`,
      },
    }));

    it('should show a table pagination with initial per page', async () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ savedObjects: longItemList })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          initialPageSize={15}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.find(EuiTablePagination).first().prop('itemsPerPage')).toEqual(15);
      expect(wrapper.find(EuiListGroup).children().length).toBe(15);
    });

    it('should allow switching the page size', async () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ savedObjects: longItemList })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          initialPageSize={15}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.find(EuiTablePagination).first().prop('onChangeItemsPerPage')!(5);
      expect(wrapper.find(EuiListGroup).children().length).toBe(5);
    });

    it('should switch page correctly', async () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ savedObjects: longItemList })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          initialPageSize={15}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.find(EuiTablePagination).first().prop('onChangePage')!(1);
      expect(wrapper.find(EuiListGroup).children().first().key()).toBe('15');
    });

    it('should show an ordinary pagination for fixed page sizes', async () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ savedObjects: longItemList })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          fixedPageSize={33}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.find(EuiPagination).first().prop('pageCount')).toEqual(2);
      expect(wrapper.find(EuiListGroup).children().length).toBe(33);
    });

    it('should switch page correctly for fixed page sizes', async () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ savedObjects: longItemList })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          fixedPageSize={33}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.find(EuiPagination).first().prop('onPageClick')!(1);
      expect(wrapper.find(EuiListGroup).children().first().key()).toBe('33');
    });
  });

  describe('loading state', () => {
    it('should display a spinner during initial loading', () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as jest.Mock).mockResolvedValue({ savedObjects: [] });

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          savedObjectMetaData={searchMetaData}
        />
      );

      expect(wrapper.containsMatchingElement(<EuiLoadingSpinner />)).toBe(true);
    });

    it('should hide the spinner if data is shown', async () => {
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ savedObjects: [doc] })
      );

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
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
      const core = coreMock.createStart();
      (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ savedObjects: [doc] })
      );

      const wrapper = shallow(
        <SavedObjectFinder
          savedObjects={core.savedObjects}
          uiSettings={core.uiSettings}
          savedObjectMetaData={searchMetaData}
        />
      );

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

  it('should render with children', async () => {
    const core = coreMock.createStart();
    (core.savedObjects.client.find as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ savedObjects: [doc, doc2] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const wrapper = shallow(
      <SavedObjectFinder
        savedObjects={core.savedObjects}
        uiSettings={core.uiSettings}
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
      >
        <button id="testChildButton">Dummy text</button>
      </SavedObjectFinder>
    );
    expect(wrapper.exists('#testChildButton')).toBe(true);
  });
});
