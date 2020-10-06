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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { TypesStart, VisType, VisGroups } from '../../vis_types';
import { GroupSelection } from './group_selection';
import { DocLinksStart } from '../../../../../core/public';

describe('GroupSelection', () => {
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
      name: 'vis1',
      title: 'Vis Type 1',
      stage: 'production',
      group: 'other',
      ...defaultVisTypeParams,
    },
    {
      name: 'vis2',
      title: 'Vis Type 2',
      group: 'other',
      stage: 'production',
      ...defaultVisTypeParams,
    },
    {
      name: 'visWithAliasUrl',
      title: 'Vis with alias Url',
      stage: 'production',
      group: 'other',
    },
  ] as VisType[];

  const visTypesRegistry = (visTypes: VisType[]): TypesStart => {
    return {
      get<T>(id: string): VisType<T> {
        return (visTypes.find((vis) => vis.name === id) as unknown) as VisType<T>;
      },
      all: () => {
        return (visTypes as unknown) as VisType[];
      },
      getAliases: () => [],
      unRegisterAlias: () => [],
      getByGroup: (group: VisGroups) => {
        return (visTypes.filter((type) => {
          return type.group === group;
        }) as unknown) as VisType[];
      },
    };
  };

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

  it('should render the header title', () => {
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry(_visTypes)}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="groupModalHeader"]').at(0).text()).toBe(
      'New Visualization'
    );
  });

  it('should not render the aggBased group card if no aggBased group vis is not registered', () => {
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry(_visTypes)}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="visGroup-aggbased"]').exists()).toBe(false);
  });

  it('should render the aggBased group card if a aggBased group vis is registered', () => {
    const aggBasedVisType = {
      name: 'visWithSearch',
      title: 'Vis with search',
      group: 'aggbased',
      stage: 'production',
      ...defaultVisTypeParams,
    };
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry([..._visTypes, aggBasedVisType] as VisType[])}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="visGroup-aggbased"]').exists()).toBe(true);
  });

  it('should not render the tools group card if no aggBased group vis is not registered', () => {
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry(_visTypes)}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="visGroup-tools"]').exists()).toBe(false);
  });

  it('should render the aggBased group card if a tools group vis is registered', () => {
    const toolsVisType = {
      name: 'vis3',
      title: 'Vis3',
      stage: 'production',
      group: 'tools',
      ...defaultVisTypeParams,
    };
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry([..._visTypes, toolsVisType] as VisType[])}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="visGroup-tools"]').exists()).toBe(true);
  });

  it('should call the toggleGroups if the aggBased group card is clicked', () => {
    const toggleGroups = jest.fn();
    const aggBasedVisType = {
      name: 'visWithSearch',
      title: 'Vis with search',
      group: 'aggbased',
      stage: 'production',
      ...defaultVisTypeParams,
    };
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry([..._visTypes, aggBasedVisType] as VisType[])}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={toggleGroups}
        onVisTypeSelected={jest.fn()}
      />
    );
    const aggBasedGroupCard = wrapper.find('[data-test-subj="visGroupAggBasedExploreLink"]').at(0);
    aggBasedGroupCard.simulate('click');
    expect(toggleGroups).toHaveBeenCalled();
  });
});
