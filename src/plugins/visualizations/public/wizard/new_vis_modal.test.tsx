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

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { TypesStart, VisType, VisGroups } from '../vis_types';
import NewVisModal from './new_vis_modal';
import { ApplicationStart, SavedObjectsStart, DocLinksStart } from '../../../../core/public';
import { embeddablePluginMock } from '../../../embeddable/public/mocks';

describe('NewVisModal', () => {
  const defaultVisTypeParams = {
    hidden: false,
    visualization: class Controller {
      public render = jest.fn();
      public destroy = jest.fn();
    },
    requiresSearch: false,
    requestHandler: 'none',
    responseHandler: 'none',
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
  ];
  const visTypes: TypesStart = {
    get<T>(id: string): VisType<T> {
      return (_visTypes.find((vis) => vis.name === id) as unknown) as VisType<T>;
    },
    all: () => {
      return (_visTypes as unknown) as VisType[];
    },
    getAliases: () => [],
    unRegisterAlias: () => [],
    getByGroup: (group: VisGroups) => {
      return (_visTypes.filter((type) => {
        return type.group === group;
      }) as unknown) as VisType[];
    },
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
          application={({ navigateToApp } as unknown) as ApplicationStart}
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
          application={({ navigateToApp } as unknown) as ApplicationStart}
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
