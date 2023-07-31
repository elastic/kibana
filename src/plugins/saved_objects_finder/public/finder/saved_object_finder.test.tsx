/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const nextTick = () => new Promise((res) => process.nextTick(res));

import lodash from 'lodash';
jest.spyOn(lodash, 'debounce').mockImplementation((fn: any) => fn);
import {
  EuiInMemoryTable,
  EuiLink,
  EuiSearchBarProps,
  EuiText,
  EuiButton,
  Query,
} from '@elastic/eui';
import { IconType } from '@elastic/eui';
import { mount, shallow } from 'enzyme';
import React from 'react';
import * as sinon from 'sinon';
import { SavedObjectFinderUi as SavedObjectFinder } from './saved_object_finder';
import { coreMock } from '@kbn/core/public/mocks';
import { savedObjectsManagementPluginMock } from '@kbn/saved-objects-management-plugin/public/mocks';
import { findTestSubject } from '@kbn/test-jest-helpers';
import { SavedObjectManagementTypeInfo } from '@kbn/saved-objects-management-plugin/public';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';

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
      defaultSearchField: 'name',
    },
  ];

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

  const savedObjectsManagement = savedObjectsManagementPluginMock.createStartContract();
  savedObjectsManagement.parseQuery.mockImplementation(
    (query: Query, types: SavedObjectManagementTypeInfo[]) => {
      const queryTypes = query.ast.getFieldClauses('type')?.[0].value as string[] | undefined;
      return {
        queryText: query.ast
          .getTermClauses()
          .map((clause: any) => clause.value)
          .join(' '),
        visibleTypes: queryTypes?.filter((name) => types.some((type) => type.name === name)),
        selectedTags: query.ast.getFieldClauses('tag')?.[0].value as string[] | undefined,
      };
    }
  );
  savedObjectsManagement.getTagFindReferences.mockImplementation(
    ({ selectedTags }) => selectedTags as any
  );

  const savedObjectsTagging = {
    ui: {
      getTableColumnDefinition: jest.fn(() => ({
        field: 'references',
        name: 'Tags',
        description: 'Tags associated with this saved object',
        'data-test-subj': 'listingTableRowTags',
        sortable: (item: any) => `tag-${item.id}`,
        render: (_: any, item: any) => <span>{`tag-${item.id}`}</span>,
      })),
      getSearchBarFilter: jest.fn(() => ({
        type: 'field_value_selection',
        field: 'tag',
        name: 'Tags',
        multiSelect: 'or',
        options: [],
      })),
    },
  } as any as SavedObjectsTaggingApi;

  it('should call API on startup', async () => {
    const core = coreMock.createStart();
    (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ saved_objects: [doc] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const wrapper = shallow(
      <SavedObjectFinder
        services={{
          http: core.http,
          uiSettings: core.uiSettings,
          savedObjectsManagement,
          savedObjectsTagging,
        }}
        savedObjectMetaData={searchMetaData}
      />
    );

    wrapper.instance().componentDidMount!();
    await nextTick();
    expect(core.http.get).toHaveBeenCalledWith('/internal/saved-objects-finder/find', {
      query: {
        type: ['search'],
        fields: ['title', 'name'],
        search: undefined,
        hasReference: undefined,
        page: 1,
        perPage: 10,
        searchFields: ['title^3', 'description', 'name'],
        defaultSearchOperator: 'AND',
      },
    });
  });

  describe('render', () => {
    it('lists initial items', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(
        wrapper
          .find(EuiInMemoryTable)
          .prop('items')
          .map((item: any) => item.attributes)
      ).toEqual([doc.attributes]);
    });

    it('calls onChoose on item click', async () => {
      const chooseStub = sinon.stub();
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          onChoose={chooseStub}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.update();
      findTestSubject(wrapper, 'savedObjectTitleExample-title').simulate('click');
      expect(chooseStub.calledWith('1', 'search', `${doc.attributes.title} (Search)`, doc)).toEqual(
        true
      );
    });

    it('with help text', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = shallow(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={searchMetaData}
          helpText="This is some description about the action"
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.find(EuiText).childAt(0).text()).toEqual(
        'This is some description about the action'
      );
    });

    it('with left button', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc] })
      );
      core.uiSettings.get.mockImplementation(() => 10);
      const button = <EuiButton>Hello</EuiButton>;
      const wrapper = shallow(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={searchMetaData}
          leftChildren={button}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      const searchBar = wrapper.find(EuiInMemoryTable).prop('search') as EuiSearchBarProps;
      const toolsLeft = searchBar!.toolsLeft;
      expect(toolsLeft).toMatchInlineSnapshot(
        `
        <React.Fragment>
          <EuiButton
            color="primary"
            size="m"
          >
            Hello
          </EuiButton>
        </React.Fragment>
      `
      );
    });
  });

  describe('sorting', () => {
    it('should list items by type ascending', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc, doc3, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      findTestSubject(
        findTestSubject(wrapper, 'tableHeaderCell_type_0'),
        'tableHeaderSortButton'
      ).simulate('click');
      const titleLinks = wrapper.find(EuiLink);
      expect(titleLinks.at(0).text()).toEqual(doc.attributes.title);
      expect(titleLinks.at(1).text()).toEqual(doc2.attributes.title);
      expect(titleLinks.at(2).text()).toEqual(doc3.attributes.title);
    });

    it('should list items by type descending', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc, doc3, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      findTestSubject(
        findTestSubject(wrapper, 'tableHeaderCell_type_0'),
        'tableHeaderSortButton'
      ).simulate('click');
      findTestSubject(
        findTestSubject(wrapper, 'tableHeaderCell_type_0'),
        'tableHeaderSortButton'
      ).simulate('click');
      const titleLinks = wrapper.find(EuiLink);
      expect(titleLinks.at(0).text()).toEqual(doc3.attributes.title);
      expect(titleLinks.at(1).text()).toEqual(doc.attributes.title);
      expect(titleLinks.at(2).text()).toEqual(doc2.attributes.title);
    });

    it('should list items by title ascending', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.update();
      const titleLinks = wrapper.find(EuiLink);
      expect(titleLinks.at(0).text()).toEqual(doc2.attributes.title);
      expect(titleLinks.at(1).text()).toEqual(doc.attributes.title);
    });

    it('should list items by title descending', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      findTestSubject(
        findTestSubject(wrapper, 'tableHeaderCell_title_0'),
        'tableHeaderSortButton'
      ).simulate('click');
      const titleLinks = wrapper.find(EuiLink);
      expect(titleLinks.at(0).text()).toEqual(doc.attributes.title);
      expect(titleLinks.at(1).text()).toEqual(doc2.attributes.title);
    });

    it('should list items by tag ascending', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc, doc3, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      findTestSubject(
        findTestSubject(wrapper, 'tableHeaderCell_references_2'),
        'tableHeaderSortButton'
      ).simulate('click');
      const titleLinks = wrapper.find(EuiLink);
      expect(titleLinks.at(0).text()).toEqual(doc.attributes.title);
      expect(titleLinks.at(1).text()).toEqual(doc2.attributes.title);
      expect(titleLinks.at(2).text()).toEqual(doc3.attributes.title);
    });

    it('should list items by tag descending', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc, doc3, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      findTestSubject(
        findTestSubject(wrapper, 'tableHeaderCell_references_2'),
        'tableHeaderSortButton'
      ).simulate('click');
      findTestSubject(
        findTestSubject(wrapper, 'tableHeaderCell_references_2'),
        'tableHeaderSortButton'
      ).simulate('click');
      const titleLinks = wrapper.find(EuiLink);
      expect(titleLinks.at(0).text()).toEqual(doc3.attributes.title);
      expect(titleLinks.at(1).text()).toEqual(doc2.attributes.title);
      expect(titleLinks.at(2).text()).toEqual(doc.attributes.title);
    });
  });

  it('should not show the saved objects which get filtered by showSavedObject', async () => {
    const core = coreMock.createStart();
    (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ saved_objects: [doc, doc2] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const wrapper = shallow(
      <SavedObjectFinder
        services={{
          http: core.http,
          uiSettings: core.uiSettings,
          savedObjectsManagement,
          savedObjectsTagging,
        }}
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
    const items: any[] = wrapper.find(EuiInMemoryTable).prop('items');
    expect(items).toHaveLength(1);
    expect(items[0].attributes.title).toBe(doc2.attributes.title);
  });

  describe('search', () => {
    it('should request filtered list on search input', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper
        .find('[data-test-subj="savedObjectFinderSearchInput"] input')
        .simulate('keyup', { key: 'Enter', target: { value: 'abc' } });
      expect(core.http.get).toHaveBeenCalledWith('/internal/saved-objects-finder/find', {
        query: {
          type: ['search'],
          fields: ['title', 'name'],
          search: 'abc*',
          hasReference: undefined,
          page: 1,
          perPage: 10,
          searchFields: ['title^3', 'description', 'name'],
          defaultSearchOperator: 'AND',
        },
      });
    });

    it('should include additional fields in search if listed in meta data', async () => {
      const core = coreMock.createStart();
      (core.http.get as jest.Mock).mockResolvedValue({ saved_objects: [] });
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
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
        .find('[data-test-subj="savedObjectFinderSearchInput"] input')
        .simulate('keyup', { key: 'Enter', target: { value: 'abc' } });
      expect(core.http.get).toHaveBeenCalledWith('/internal/saved-objects-finder/find', {
        query: {
          type: ['type1', 'type2'],
          fields: ['title', 'name', 'field1', 'field2', 'field3'],
          search: 'abc*',
          hasReference: undefined,
          page: 1,
          perPage: 10,
          searchFields: ['title^3', 'description'],
          defaultSearchOperator: 'AND',
        },
      });
    });

    it('should respect response order on search input', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper
        .find('[data-test-subj="savedObjectFinderSearchInput"] input')
        .simulate('keyup', { key: 'Enter', target: { value: 'abc' } });
      const titleLinks = wrapper.find(EuiLink);
      expect(titleLinks.at(0).text()).toEqual(doc.attributes.title);
      expect(titleLinks.at(1).text()).toEqual(doc2.attributes.title);
    });
  });

  it('should request multiple saved object types at once', async () => {
    const core = coreMock.createStart();
    (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ saved_objects: [doc, doc2] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const wrapper = shallow(
      <SavedObjectFinder
        services={{
          http: core.http,
          uiSettings: core.uiSettings,
          savedObjectsManagement,
          savedObjectsTagging,
        }}
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

    expect(core.http.get).toHaveBeenCalledWith('/internal/saved-objects-finder/find', {
      query: {
        type: ['search', 'vis'],
        fields: ['title', 'name'],
        search: undefined,
        page: 1,
        perPage: 10,
        searchFields: ['title^3', 'description'],
        defaultSearchOperator: 'AND',
      },
    });
  });

  describe('filter', () => {
    it('should render filter buttons if enabled', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({
          saved_objects: [doc, doc2, doc3],
        })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          showFilter={true}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.find('button.euiFilterButton')).toHaveLength(2);
      expect(wrapper.find('button.euiFilterButton span[data-text="Types"]')).toHaveLength(1);
      expect(wrapper.find('button.euiFilterButton span[data-text="Tags"]')).toHaveLength(1);
    });

    it('should not render filter buttons if disabled', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({
          saved_objects: [doc, doc2, doc3],
        })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          showFilter={false}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.find('button.euiFilterButton')).toHaveLength(0);
    });

    it('should not render types filter button if there is only one type in the metadata list', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({
          saved_objects: [doc, doc2],
        })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          showFilter={true}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.find('button.euiFilterButton [data-text="Types"]')).toHaveLength(0);
      expect(wrapper.find('button.euiFilterButton')).toHaveLength(1);
    });

    it('should not render tags filter button if savedObjectsTagging is undefined', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({
          saved_objects: [doc, doc2, doc3],
        })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging: undefined,
          }}
          showFilter={true}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      expect(wrapper.find('button.euiFilterButton [data-text="Tags"]')).toHaveLength(0);
      expect(wrapper.find('button.euiFilterButton')).toHaveLength(1);
    });

    it('should apply types filter if selected', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({
          saved_objects: [doc, doc2, doc3],
        })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          showFilter={true}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      const table = wrapper.find<EuiInMemoryTable<any>>(EuiInMemoryTable);
      const search = table.prop('search') as EuiSearchBarProps;
      search.onChange?.({ query: Query.parse('type:(vis)'), queryText: '', error: null });
      expect(core.http.get).toHaveBeenLastCalledWith('/internal/saved-objects-finder/find', {
        query: {
          type: ['vis'],
          fields: ['title', 'name'],
          search: undefined,
          hasReference: undefined,
          page: 1,
          perPage: 10,
          searchFields: ['title^3', 'description'],
          defaultSearchOperator: 'AND',
        },
      });
      search.onChange?.({ query: Query.parse('type:(search or vis)'), queryText: '', error: null });
      expect(core.http.get).toHaveBeenLastCalledWith('/internal/saved-objects-finder/find', {
        query: {
          type: ['search', 'vis'],
          fields: ['title', 'name'],
          search: undefined,
          hasReference: undefined,
          page: 1,
          perPage: 10,
          searchFields: ['title^3', 'description'],
          defaultSearchOperator: 'AND',
        },
      });
    });

    it('should apply tags filter if selected', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({
          saved_objects: [doc, doc2, doc3],
        })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          showFilter={true}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      const table = wrapper.find<EuiInMemoryTable<any>>(EuiInMemoryTable);
      const search = table.prop('search') as EuiSearchBarProps;
      search.onChange?.({ query: Query.parse('tag:(tag1)'), queryText: '', error: null });
      expect(core.http.get).toHaveBeenLastCalledWith('/internal/saved-objects-finder/find', {
        query: {
          type: ['search', 'vis'],
          fields: ['title', 'name'],
          search: undefined,
          hasReference: JSON.stringify(['tag1']),
          page: 1,
          perPage: 10,
          searchFields: ['title^3', 'description'],
          defaultSearchOperator: 'AND',
        },
      });
      search.onChange?.({ query: Query.parse('tag:(tag1 or tag2)'), queryText: '', error: null });
      expect(core.http.get).toHaveBeenLastCalledWith('/internal/saved-objects-finder/find', {
        query: {
          type: ['search', 'vis'],
          fields: ['title', 'name'],
          search: undefined,
          hasReference: JSON.stringify(['tag1', 'tag2']),
          page: 1,
          perPage: 10,
          searchFields: ['title^3', 'description'],
          defaultSearchOperator: 'AND',
        },
      });
    });
  });

  it('should display no items message if there are no items', async () => {
    const core = coreMock.createStart();
    (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ saved_objects: [] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const noItemsMessage = <span id="myNoItemsMessage" />;
    const wrapper = mount(
      <SavedObjectFinder
        services={{
          http: core.http,
          uiSettings: core.uiSettings,
          savedObjectsManagement,
          savedObjectsTagging,
        }}
        noItemsMessage={noItemsMessage}
        savedObjectMetaData={searchMetaData}
      />
    );

    wrapper.instance().componentDidMount!();
    await nextTick();

    expect(wrapper.find(EuiInMemoryTable).prop('message')).toEqual(noItemsMessage);
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
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: longItemList })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          initialPageSize={15}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.update();
      const pagination = wrapper.find(EuiInMemoryTable).prop('pagination') as any;
      expect(pagination.showPerPageOptions).toBe(true);
      expect(pagination.initialPageSize).toEqual(15);
      expect(wrapper.find(EuiInMemoryTable).find('tbody tr')).toHaveLength(15);
    });

    it('should allow switching the page size', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: longItemList })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          initialPageSize={15}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      const table = wrapper.find<EuiInMemoryTable<any>>(EuiInMemoryTable);
      const sort = table.prop('sorting');
      table.instance().onTableChange({
        page: {
          index: 0,
          size: 5,
        },
        sort: typeof sort === 'object' ? sort?.sort : undefined,
      });
      wrapper.update();
      expect(wrapper.find(EuiInMemoryTable).find('tbody tr')).toHaveLength(5);
    });

    it('should switch page correctly', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: longItemList })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          initialPageSize={15}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.update();
      expect(wrapper.find(EuiInMemoryTable).find('tbody tr')).toHaveLength(15);
      const table = wrapper.find<EuiInMemoryTable<any>>(EuiInMemoryTable);
      const pagination = table.prop('pagination') as any;
      const sort = table.prop('sorting');
      table.instance().onTableChange({
        page: {
          index: 3,
          size: pagination.initialPageSize,
        },
        sort: typeof sort === 'object' ? sort?.sort : undefined,
      });
      wrapper.update();
      expect(wrapper.find(EuiInMemoryTable).find('tbody tr')).toHaveLength(5);
    });

    it('should show an ordinary pagination for fixed page sizes', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: longItemList })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          fixedPageSize={33}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.update();
      const pagination = wrapper.find(EuiInMemoryTable).prop('pagination') as any;
      expect(pagination.showPerPageOptions).toBe(false);
      expect(pagination.initialPageSize).toEqual(33);
      expect(wrapper.find(EuiInMemoryTable).find('tbody tr')).toHaveLength(33);
    });

    it('should switch page correctly for fixed page sizes', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: longItemList })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          fixedPageSize={33}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.update();
      expect(wrapper.find(EuiInMemoryTable).find('tbody tr')).toHaveLength(33);
      const table = wrapper.find<EuiInMemoryTable<any>>(EuiInMemoryTable);
      const pagination = table.prop('pagination') as any;
      const sort = table.prop('sorting');
      table.instance().onTableChange({
        page: {
          index: 1,
          size: pagination.initialPageSize,
        },
        sort: typeof sort === 'object' ? sort?.sort : undefined,
      });
      wrapper.update();
      expect(wrapper.find(EuiInMemoryTable).find('tbody tr')).toHaveLength(17);
    });
  });

  describe('loading state', () => {
    it('should display a loading indicator during initial loading', () => {
      const core = coreMock.createStart();
      (core.http.get as jest.Mock).mockResolvedValue({ saved_objects: [] });
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={searchMetaData}
        />
      );

      expect(wrapper.find('.euiBasicTable-loading')).toHaveLength(1);
    });

    it('should hide the loading indicator if data is shown', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
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
      wrapper.update();
      expect(wrapper.find('.euiBasicTable-loading')).toHaveLength(0);
    });

    it('should show the loading indicator if there are already items and the search is updated', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.update();
      expect(wrapper.find('.euiBasicTable-loading')).toHaveLength(0);
      wrapper
        .find('[data-test-subj="savedObjectFinderSearchInput"] input')
        .simulate('keyup', { key: 'Enter', target: { value: 'abc' } });
      wrapper.update();
      expect(wrapper.find('.euiBasicTable-loading')).toHaveLength(1);
    });
  });

  it('should render with children', async () => {
    const core = coreMock.createStart();
    (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
      Promise.resolve({ saved_objects: [doc, doc2] })
    );
    core.uiSettings.get.mockImplementation(() => 10);

    const wrapper = mount(
      <SavedObjectFinder
        services={{
          http: core.http,
          uiSettings: core.uiSettings,
          savedObjectsManagement,
          savedObjectsTagging,
        }}
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

  describe('columns', () => {
    it('should show all columns', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc, doc2, doc3] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.update();
      expect(wrapper.find(EuiInMemoryTable).find('th')).toHaveLength(3);
      expect(findTestSubject(wrapper, 'tableHeaderCell_type_0')).toHaveLength(1);
      expect(findTestSubject(wrapper, 'tableHeaderCell_title_1')).toHaveLength(1);
      expect(findTestSubject(wrapper, 'tableHeaderCell_references_2')).toHaveLength(1);
    });

    it('should hide the type column if there is only one type in the metadata list', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc, doc2] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging,
          }}
          savedObjectMetaData={searchMetaData}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.update();
      expect(wrapper.find(EuiInMemoryTable).find('th')).toHaveLength(2);
      expect(findTestSubject(wrapper, 'tableHeaderCell_type_0')).toHaveLength(0);
      expect(findTestSubject(wrapper, 'tableHeaderCell_title_0')).toHaveLength(1);
      expect(findTestSubject(wrapper, 'tableHeaderCell_references_1')).toHaveLength(1);
    });

    it('should hide the tags column if savedObjectsTagging is undefined', async () => {
      const core = coreMock.createStart();
      (core.http.get as any as jest.SpyInstance).mockImplementation(() =>
        Promise.resolve({ saved_objects: [doc, doc2, doc3] })
      );
      core.uiSettings.get.mockImplementation(() => 10);

      const wrapper = mount(
        <SavedObjectFinder
          services={{
            http: core.http,
            uiSettings: core.uiSettings,
            savedObjectsManagement,
            savedObjectsTagging: undefined,
          }}
          savedObjectMetaData={metaDataConfig}
        />
      );

      wrapper.instance().componentDidMount!();
      await nextTick();
      wrapper.update();
      expect(wrapper.find(EuiInMemoryTable).find('th')).toHaveLength(2);
      expect(findTestSubject(wrapper, 'tableHeaderCell_type_0')).toHaveLength(1);
      expect(findTestSubject(wrapper, 'tableHeaderCell_title_1')).toHaveLength(1);
      expect(findTestSubject(wrapper, 'tableHeaderCell_references_2')).toHaveLength(0);
    });
  });
});
