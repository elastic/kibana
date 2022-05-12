/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { TypesStart, VisGroups, BaseVisType } from '../vis_types';
import NewVisModal from './new_vis_modal';
import { ApplicationStart, SavedObjectsStart, DocLinksStart } from '@kbn/core/public';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';

describe('NewVisModal', () => {
  const defaultVisTypeParams = {
    hidden: false,
    requiresSearch: false,
  };
  const _visTypes = [
    {
      name: 'vis',
      title: 'Vis Type 1',
      stage: 'production',
      group: VisGroups.PROMOTED,
      ...defaultVisTypeParams,
    },
    {
      name: 'vis2',
      title: 'Vis Type 2',
      group: VisGroups.PROMOTED,
      stage: 'production',
      ...defaultVisTypeParams,
    },
    {
      name: 'vis3',
      title: 'Vis3',
      stage: 'production',
      group: VisGroups.TOOLS,
      ...defaultVisTypeParams,
    },
    {
      name: 'visWithAliasUrl',
      title: 'Vis with alias Url',
      stage: 'production',
      group: VisGroups.PROMOTED,
      aliasApp: 'otherApp',
      aliasPath: '#/aliasUrl',
    },
    {
      name: 'visWithSearch',
      title: 'Vis with search',
      group: VisGroups.AGGBASED,
      stage: 'production',
      ...defaultVisTypeParams,
    },
  ] as BaseVisType[];
  const visTypes: TypesStart = {
    get<T>(id: string): BaseVisType<T> {
      return _visTypes.find((vis) => vis.name === id) as unknown as BaseVisType<T>;
    },
    all: () => _visTypes,
    getAliases: () => [],
    unRegisterAlias: () => [],
    getByGroup: (group: VisGroups) => _visTypes.filter((type) => type.group === group),
  };
  const addBasePath = (url: string) => `testbasepath${url}`;
  const settingsGet = jest.fn();
  const uiSettings: any = { get: settingsGet };
  const docLinks = {
    links: {
      dashboard: {
        guide: 'test',
      },
    },
  };

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        assign: jest.fn(),
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show the aggbased group but not the visualization assigned to this group', () => {
    const wrapper = mountWithIntl(
      <NewVisModal
        isOpen={true}
        onClose={() => null}
        visTypesRegistry={visTypes}
        addBasePath={addBasePath}
        uiSettings={uiSettings}
        application={{} as ApplicationStart}
        docLinks={docLinks as DocLinksStart}
        savedObjects={{} as SavedObjectsStart}
      />
    );
    expect(wrapper.find('[data-test-subj="visGroup-aggbased"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="visType-visWithSearch"]').exists()).toBe(false);
  });

  it('should show the tools group', () => {
    const wrapper = mountWithIntl(
      <NewVisModal
        isOpen={true}
        onClose={() => null}
        visTypesRegistry={visTypes}
        addBasePath={addBasePath}
        uiSettings={uiSettings}
        application={{} as ApplicationStart}
        docLinks={docLinks as DocLinksStart}
        savedObjects={{} as SavedObjectsStart}
      />
    );
    expect(wrapper.find('[data-test-subj="visGroup-tools"]').exists()).toBe(true);
  });

  it('should display the visualizations of the other group', () => {
    const wrapper = mountWithIntl(
      <NewVisModal
        isOpen={true}
        onClose={() => null}
        visTypesRegistry={visTypes}
        addBasePath={addBasePath}
        uiSettings={uiSettings}
        application={{} as ApplicationStart}
        docLinks={docLinks as DocLinksStart}
        savedObjects={{} as SavedObjectsStart}
      />
    );
    expect(wrapper.find('[data-test-subj="visType-vis2"]').exists()).toBe(true);
  });

  describe('open editor', () => {
    it('should open the editor for visualizations without search', () => {
      const wrapper = mountWithIntl(
        <NewVisModal
          isOpen={true}
          onClose={() => null}
          visTypesRegistry={visTypes}
          addBasePath={addBasePath}
          uiSettings={uiSettings}
          application={{} as ApplicationStart}
          docLinks={docLinks as DocLinksStart}
          savedObjects={{} as SavedObjectsStart}
        />
      );
      const visCard = wrapper.find('[data-test-subj="visType-vis"]').at(0);
      visCard.simulate('click');
      expect(window.location.assign).toBeCalledWith('testbasepath/app/visualize#/create?type=vis');
    });

    it('passes through editor params to the editor URL', () => {
      const wrapper = mountWithIntl(
        <NewVisModal
          isOpen={true}
          onClose={() => null}
          visTypesRegistry={visTypes}
          editorParams={['foo=true', 'bar=42']}
          addBasePath={addBasePath}
          uiSettings={uiSettings}
          application={{} as ApplicationStart}
          docLinks={docLinks as DocLinksStart}
          savedObjects={{} as SavedObjectsStart}
        />
      );
      const visCard = wrapper.find('[data-test-subj="visType-vis"]').at(0);
      visCard.simulate('click');
      expect(window.location.assign).toBeCalledWith(
        'testbasepath/app/visualize#/create?type=vis&foo=true&bar=42'
      );
    });

    it('closes and redirects properly if visualization with aliasPath and originatingApp in props', () => {
      const onClose = jest.fn();
      const navigateToApp = jest.fn();
      const stateTransfer = embeddablePluginMock.createStartContract().getStateTransfer();
      const wrapper = mountWithIntl(
        <NewVisModal
          isOpen={true}
          onClose={onClose}
          visTypesRegistry={visTypes}
          editorParams={['foo=true', 'bar=42']}
          originatingApp={'coolJestTestApp'}
          addBasePath={addBasePath}
          uiSettings={uiSettings}
          application={{ navigateToApp } as unknown as ApplicationStart}
          docLinks={docLinks as DocLinksStart}
          stateTransfer={stateTransfer}
          savedObjects={{} as SavedObjectsStart}
        />
      );
      const visCard = wrapper.find('[data-test-subj="visType-visWithAliasUrl"]').at(0);
      visCard.simulate('click');
      expect(stateTransfer.navigateToEditor).toBeCalledWith('otherApp', {
        path: '#/aliasUrl',
        state: { originatingApp: 'coolJestTestApp' },
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('closes and redirects properly if visualization with aliasApp and without originatingApp in props', () => {
      const onClose = jest.fn();
      const navigateToApp = jest.fn();
      const wrapper = mountWithIntl(
        <NewVisModal
          isOpen={true}
          onClose={onClose}
          visTypesRegistry={visTypes}
          editorParams={['foo=true', 'bar=42']}
          addBasePath={addBasePath}
          uiSettings={uiSettings}
          application={{ navigateToApp } as unknown as ApplicationStart}
          docLinks={docLinks as DocLinksStart}
          savedObjects={{} as SavedObjectsStart}
        />
      );
      const visCard = wrapper.find('[data-test-subj="visType-visWithAliasUrl"]').at(0);
      visCard.simulate('click');
      expect(navigateToApp).toBeCalledWith('otherApp', { path: '#/aliasUrl' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('aggBased visualizations', () => {
    it('should render as expected', () => {
      const wrapper = mountWithIntl(
        <NewVisModal
          isOpen={true}
          onClose={() => null}
          visTypesRegistry={visTypes}
          addBasePath={addBasePath}
          uiSettings={uiSettings}
          application={{} as ApplicationStart}
          docLinks={docLinks as DocLinksStart}
          savedObjects={{} as SavedObjectsStart}
        />
      );
      const aggBasedGroupCard = wrapper
        .find('[data-test-subj="visGroupAggBasedExploreLink"]')
        .at(0);
      aggBasedGroupCard.simulate('click');
      expect(wrapper.find('[data-test-subj="visType-visWithSearch"]').exists()).toBe(true);
    });
  });
});
