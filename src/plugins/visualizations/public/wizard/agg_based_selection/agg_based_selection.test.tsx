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
import { AggBasedSelection } from './agg_based_selection';

describe('AggBasedSelection', () => {
  const defaultVisTypeParams = {
    hidden: false,
    requiresSearch: false,
  };
  const _visTypes = [
    {
      name: 'vis1',
      title: 'Vis Type 1',
      stage: 'production',
      group: VisGroups.PROMOTED,
      ...defaultVisTypeParams,
    },
    {
      name: 'vis2',
      title: 'Vis Type 2',
      group: VisGroups.AGGBASED,
      stage: 'production',
      ...defaultVisTypeParams,
    },
    {
      name: 'vis3',
      title: 'Vis Type 3',
      stage: 'production',
      group: VisGroups.AGGBASED,
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

  it('should call the toggleGroups if the user clicks the goBack link', () => {
    const toggleGroups = jest.fn();
    const wrapper = mountWithIntl(
      <AggBasedSelection
        visTypesRegistry={visTypes}
        toggleGroups={toggleGroups}
        onVisTypeSelected={jest.fn()}
      />
    );
    const aggBasedGroupCard = wrapper.find('[data-test-subj="goBackLink"]').at(0);
    aggBasedGroupCard.simulate('click');
    expect(toggleGroups).toHaveBeenCalled();
  });

  describe('filter for visualization types', () => {
    it('should render as expected', () => {
      const wrapper = mountWithIntl(
        <AggBasedSelection
          visTypesRegistry={visTypes}
          toggleGroups={jest.fn()}
          onVisTypeSelected={jest.fn()}
        />
      );
      const searchBox = wrapper.find('input[data-test-subj="filterVisType"]');
      searchBox.simulate('change', { target: { value: 'with' } });
      expect(wrapper.find('[data-test-subj="visType-visWithSearch"]').exists()).toBe(true);
    });
  });
});
