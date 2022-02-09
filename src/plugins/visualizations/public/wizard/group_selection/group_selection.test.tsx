/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { TypesStart, BaseVisType, VisGroups } from '../../vis_types';
import { GroupSelection } from './group_selection';
import { DocLinksStart } from '../../../../../core/public';

describe('GroupSelection', () => {
  const defaultVisTypeParams = {
    hidden: false,
    requiresSearch: false,
  };
  const _visTypes = [
    {
      name: 'vis1',
      title: 'Vis Type 1',
      description: 'Vis Type 1',
      stage: 'production',
      group: VisGroups.PROMOTED,
      ...defaultVisTypeParams,
    },
    {
      name: 'vis2',
      title: 'Vis Type 2',
      description: 'Vis Type 2',
      group: VisGroups.PROMOTED,
      stage: 'production',
      ...defaultVisTypeParams,
    },
    {
      name: 'visWithAliasUrl',
      title: 'Vis with alias Url',
      aliasApp: 'aliasApp',
      aliasPath: '#/aliasApp',
      description: 'Vis with alias Url',
      stage: 'production',
      group: VisGroups.PROMOTED,
    },
    {
      name: 'visAliasWithPromotion',
      title: 'Vis alias with promotion',
      description: 'Vis alias with promotion',
      stage: 'production',
      group: VisGroups.PROMOTED,
      aliasApp: 'anotherApp',
      aliasPath: '#/anotherUrl',
      promotion: true,
    } as unknown,
  ] as BaseVisType[];

  const visTypesRegistry = (visTypes: BaseVisType[]): TypesStart => {
    return {
      get<T>(id: string): BaseVisType<T> {
        return visTypes.find((vis) => vis.name === id) as unknown as BaseVisType<T>;
      },
      all: () => {
        return visTypes as unknown as BaseVisType[];
      },
      getAliases: () => [],
      unRegisterAlias: () => [],
      getByGroup: (group: VisGroups) => {
        return visTypes.filter((type) => {
          return type.group === group;
        }) as unknown as BaseVisType[];
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
        showExperimental={true}
      />
    );
    expect(wrapper.find('[data-test-subj="groupModalHeader"]').at(0).text()).toBe(
      'New visualization'
    );
  });

  it('should not render the aggBased group card if no aggBased visualization is registered', () => {
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry(_visTypes)}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
        showExperimental={true}
      />
    );
    expect(wrapper.find('[data-test-subj="visGroup-aggbased"]').exists()).toBe(false);
  });

  it('should render the aggBased group card if an aggBased group vis is registered', () => {
    const aggBasedVisType = {
      name: 'visWithSearch',
      title: 'Vis with search',
      group: VisGroups.AGGBASED,
      stage: 'production',
      ...defaultVisTypeParams,
    };
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry([..._visTypes, aggBasedVisType] as BaseVisType[])}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
        showExperimental={true}
      />
    );
    expect(wrapper.find('[data-test-subj="visGroup-aggbased"]').exists()).toBe(true);
  });

  it('should not render the tools group card if no tools visualization is registered', () => {
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry(_visTypes)}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
        showExperimental={true}
      />
    );
    expect(wrapper.find('[data-test-subj="visGroup-tools"]').exists()).toBe(false);
  });

  it('should render the tools group card if a tools group vis is registered', () => {
    const toolsVisType = {
      name: 'vis3',
      title: 'Vis3',
      stage: 'production',
      group: VisGroups.TOOLS,
      ...defaultVisTypeParams,
    };
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry([..._visTypes, toolsVisType] as BaseVisType[])}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
        showExperimental={true}
      />
    );
    expect(wrapper.find('[data-test-subj="visGroup-tools"]').exists()).toBe(true);
  });

  it('should call the toggleGroups if the aggBased group card is clicked', () => {
    const toggleGroups = jest.fn();
    const aggBasedVisType = {
      name: 'visWithSearch',
      title: 'Vis with search',
      group: VisGroups.AGGBASED,
      stage: 'production',
      ...defaultVisTypeParams,
    };
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry([..._visTypes, aggBasedVisType] as BaseVisType[])}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={toggleGroups}
        onVisTypeSelected={jest.fn()}
        showExperimental={true}
      />
    );
    const aggBasedGroupCard = wrapper.find('[data-test-subj="visGroupAggBasedExploreLink"]').at(0);
    aggBasedGroupCard.simulate('click');
    expect(toggleGroups).toHaveBeenCalled();
  });

  it('should sort promoted visualizations first', () => {
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry(_visTypes as BaseVisType[])}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
        showExperimental={true}
      />
    );

    const cards = [
      ...new Set(
        wrapper.find('[data-test-subj^="visType-"]').map((card) => card.prop('data-test-subj'))
      ),
    ];

    expect(cards).toEqual([
      'visType-visAliasWithPromotion',
      'visType-vis1',
      'visType-vis2',
      'visType-visWithAliasUrl',
    ]);
  });

  it('should not show tools experimental visualizations if showExperimentalis false', () => {
    const expVis = {
      name: 'visExp',
      title: 'Experimental Vis',
      group: VisGroups.TOOLS,
      stage: 'experimental',
      ...defaultVisTypeParams,
    };
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry([..._visTypes, expVis] as BaseVisType[])}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
        showExperimental={false}
      />
    );
    expect(wrapper.find('[data-test-subj="visType-visExp"]').exists()).toBe(false);
  });

  it('should show tools experimental visualizations if showExperimental is true', () => {
    const expVis = {
      name: 'visExp',
      title: 'Experimental Vis',
      group: VisGroups.TOOLS,
      stage: 'experimental',
      ...defaultVisTypeParams,
    };
    const wrapper = mountWithIntl(
      <GroupSelection
        visTypesRegistry={visTypesRegistry([..._visTypes, expVis] as BaseVisType[])}
        docLinks={docLinks as DocLinksStart}
        toggleGroups={jest.fn()}
        onVisTypeSelected={jest.fn()}
        showExperimental={true}
      />
    );
    expect(wrapper.find('[data-test-subj="visType-visExp"]').exists()).toBe(true);
  });
});
