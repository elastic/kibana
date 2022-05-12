/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';

import { DashboardOptions, DashboardState } from '../../types';
import { diffDashboardState } from './diff_dashboard_state';
import { EmbeddableInput, IEmbeddable, ViewMode } from '../../services/embeddable';

const testFilter: Filter = {
  meta: {
    alias: null,
    disabled: false,
    negate: false,
  },
  query: { query: 'hi' },
};

const getEmbeddable = (id: string) =>
  Promise.resolve({
    getExplicitInputIsEqual: (previousInput: EmbeddableInput) => true,
  } as unknown as IEmbeddable);

const getDashboardState = (state?: Partial<DashboardState>): DashboardState => {
  const defaultState: DashboardState = {
    description: 'This is a dashboard which is very neat',
    query: { query: '', language: 'kql' },
    title: 'A very neat dashboard',
    viewMode: ViewMode.VIEW,
    fullScreenMode: false,
    filters: [testFilter],
    timeRestore: false,
    tags: [],
    options: {
      hidePanelTitles: false,
      useMargins: true,
      syncColors: false,
      syncTooltips: false,
    },
    panels: {
      panel_1: {
        type: 'panel_type',
        gridData: { w: 0, h: 0, x: 0, y: 0, i: 'panel_1' },
        panelRefName: 'panel_panel_1',
        explicitInput: {
          id: 'panel_1',
        },
      },
      panel_2: {
        type: 'panel_type',
        gridData: { w: 0, h: 0, x: 0, y: 0, i: 'panel_2' },
        panelRefName: 'panel_panel_2',
        explicitInput: {
          id: 'panel_1',
        },
      },
    },
  };
  return { ...defaultState, ...state };
};

const getKeysFromDiff = async (partialState?: Partial<DashboardState>): Promise<string[]> =>
  Object.keys(
    await diffDashboardState({
      originalState: getDashboardState(),
      newState: getDashboardState(partialState),
      getEmbeddable,
    })
  );

describe('Dashboard state diff function', () => {
  it('finds no difference in equal states', async () => {
    expect(await getKeysFromDiff()).toEqual([]);
  });

  it('diffs simple state keys correctly', async () => {
    expect(
      (
        await getKeysFromDiff({
          timeRestore: true,
          title: 'what a cool new title',
          description: 'what a cool new description',
          query: { query: 'woah a query', language: 'kql' },
        })
      ).sort()
    ).toEqual(['description', 'query', 'timeRestore', 'title']);
  });

  it('picks up differences in dashboard options', async () => {
    expect(
      await getKeysFromDiff({
        options: {
          hidePanelTitles: false,
          useMargins: false,
          syncColors: false,
          syncTooltips: false,
        },
      })
    ).toEqual(['options']);
  });

  it('considers undefined and false to be equivalent in dashboard options', async () => {
    expect(
      await getKeysFromDiff({
        options: {
          useMargins: true,
          syncColors: undefined,
          syncTooltips: undefined,
        } as unknown as DashboardOptions,
      })
    ).toEqual([]);
  });

  it('calls getExplicitInputIsEqual on each panel', async () => {
    const mockedGetEmbeddable = jest.fn().mockImplementation((id) => getEmbeddable(id));
    await diffDashboardState({
      originalState: getDashboardState(),
      newState: getDashboardState(),
      getEmbeddable: mockedGetEmbeddable,
    });
    expect(mockedGetEmbeddable).toHaveBeenCalledTimes(2);
  });

  it('short circuits panels comparison when one panel returns false', async () => {
    const mockedGetEmbeddable = jest.fn().mockImplementation((id) => {
      if (id === 'panel_1') {
        return Promise.resolve({
          getExplicitInputIsEqual: (previousInput: EmbeddableInput) => false,
        } as unknown as IEmbeddable);
      }
      getEmbeddable(id);
    });

    await diffDashboardState({
      originalState: getDashboardState(),
      newState: getDashboardState(),
      getEmbeddable: mockedGetEmbeddable,
    });
    expect(mockedGetEmbeddable).toHaveBeenCalledTimes(1);
  });

  it('skips individual panel comparisons if panel ids are different', async () => {
    const mockedGetEmbeddable = jest.fn().mockImplementation((id) => getEmbeddable(id));
    const stateDiff = await diffDashboardState({
      originalState: getDashboardState(),
      newState: getDashboardState({
        panels: {
          panel_1: {
            type: 'panel_type',
            gridData: { w: 0, h: 0, x: 0, y: 0, i: 'panel_1' },
            panelRefName: 'panel_panel_1',
            explicitInput: {
              id: 'panel_1',
            },
          },
          // panel 2 has been deleted
        },
      }),
      getEmbeddable: mockedGetEmbeddable,
    });
    expect(mockedGetEmbeddable).not.toHaveBeenCalled();
    expect(Object.keys(stateDiff)).toEqual(['panels']);
  });
});
