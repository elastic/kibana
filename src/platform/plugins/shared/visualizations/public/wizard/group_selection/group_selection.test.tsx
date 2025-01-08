/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { TypesStart, BaseVisType, VisGroups } from '../../vis_types';
import { GroupSelection, GroupSelectionProps } from './group_selection';
import { DocLinksStart } from '@kbn/core/public';
import { VisParams } from '../../../common';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

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
      alias: {
        app: 'aliasApp',
        path: '#/aliasApp',
      },
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
      alias: {
        app: 'anotherApp',
        path: '#/anotherUrl',
      },
      promotion: true,
    } as unknown,
  ] as BaseVisType[];

  const visTypesRegistry = (visTypes: BaseVisType[]): TypesStart => {
    return {
      get<T extends VisParams>(id: string): BaseVisType<T> {
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
      visualize: {
        guide: 'test',
      },
    },
  } as unknown as DocLinksStart;

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

  const renderGroupSelectionComponent = (overrideProps?: Partial<GroupSelectionProps>) => {
    return render(
      <I18nProvider>
        <GroupSelection
          tab="recommended"
          setTab={jest.fn()}
          visTypesRegistry={visTypesRegistry(_visTypes)}
          docLinks={docLinks as DocLinksStart}
          showMainDialog={jest.fn()}
          onVisTypeSelected={jest.fn()}
          {...overrideProps}
        />
      </I18nProvider>
    );
  };

  it('should render the header title', () => {
    renderGroupSelectionComponent();
    expect(screen.getByTestId('groupModalHeader')).toHaveTextContent('Create visualization');
  });

  it('should not render tabs if no legacy, tools or tsvb visualizations are registered', async () => {
    renderGroupSelectionComponent();
    expect(screen.queryByRole('tab', { name: /legacy/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /recommended/i })).toBeNull();
  });

  it('should render tabs and the aggBased group card if an aggBased group vis is registered', async () => {
    const aggBasedVisType = {
      name: 'visWithSearch',
      title: 'Vis with search',
      group: VisGroups.AGGBASED,
      stage: 'production',
      ...defaultVisTypeParams,
    };
    renderGroupSelectionComponent({
      visTypesRegistry: visTypesRegistry([..._visTypes, aggBasedVisType] as BaseVisType[]),
      tab: 'legacy',
    });

    expect(screen.queryByRole('tab', { name: /legacy/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /recommended/i })).toBeInTheDocument();
    expect(screen.getByTestId('visType-aggbased')).toHaveTextContent('Aggregation-based');
  });

  it('should call the showMainDialog if the aggBased group card is clicked', async () => {
    const showMainDialog = jest.fn();
    const aggBasedVisType = {
      name: 'visWithSearch',
      title: 'Vis with search',
      group: VisGroups.AGGBASED,
      stage: 'production',
      ...defaultVisTypeParams,
    };
    renderGroupSelectionComponent({
      showMainDialog,
      visTypesRegistry: visTypesRegistry([..._visTypes, aggBasedVisType] as BaseVisType[]),
      tab: 'legacy',
    });

    await userEvent.click(screen.getByRole('button', { name: /Aggregation-based/i }));
    expect(showMainDialog).toHaveBeenCalledWith(false);
  });

  it('should only show promoted visualizations in recommended tab', () => {
    renderGroupSelectionComponent();

    const cards = screen.getAllByRole('button').map((el) => el.textContent);

    expect(cards).toEqual([
      'Vis alias with promotion',
      'Vis Type 1',
      'Vis Type 2',
      'Vis with alias Url',
    ]);
  });
});
