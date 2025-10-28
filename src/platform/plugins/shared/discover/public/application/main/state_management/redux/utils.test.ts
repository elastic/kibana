/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTabItem, extractEsqlVariables } from './utils';
import { type TabState } from './types';
import { getTabStateMock } from './__mocks__/internal_state.mocks';
import type { ControlPanelsState, ControlPanelState } from '@kbn/controls-plugin/public';
import type { ESQLControlState } from '@kbn/esql-types';
import { ESQLVariableType, EsqlControlType } from '@kbn/esql-types';
import { ESQL_CONTROL } from '@kbn/controls-constants';

const createMockTabState = (id: string, label: string): TabState => getTabStateMock({ id, label });

describe('createTabItem', () => {
  it('should create a tab with default label when no tabs exist', () => {
    const result = createTabItem([]);
    expect(result.label).toBe('Untitled');
  });

  it('should create a tab with default label when no tabs with default label exist', () => {
    const tabs = [
      createMockTabState('tab1', 'Custom Label'),
      createMockTabState('tab2', 'Another Tab'),
    ];

    const result = createTabItem(tabs);
    expect(result.label).toBe('Untitled');
  });

  it('should create a tab with number 2 when one default tab exists', () => {
    const tabs = [createMockTabState('tab1', 'Untitled')];

    const result = createTabItem(tabs);
    expect(result.label).toBe('Untitled 2');
  });

  it('should create a tab with incremented number when multiple default tabs exist', () => {
    const tabs = [
      createMockTabState('tab1', 'Untitled'),
      createMockTabState('tab2', 'Untitled 2'),
      createMockTabState('tab3', 'Untitled 5'),
    ];

    const result = createTabItem(tabs);
    expect(result.label).toBe('Untitled 6');
  });

  it('should ignore non-matching tab labels', () => {
    const tabs = [
      createMockTabState('tab1', 'Untitled'),
      createMockTabState('tab2', 'Almost Untitled 2'), // This shouldn't match
      createMockTabState('tab3', 'UntitledX'), // This shouldn't match
    ];

    const result = createTabItem(tabs);
    expect(result.label).toBe('Untitled 2');
  });
});

describe('extractEsqlVariables', () => {
  const createMockESQLControlPanel = (
    variableName: string,
    variableType: ESQLVariableType,
    selectedOptions: string[],
    singleSelect: boolean = true,
    order: number = 0
  ): ControlPanelState<ESQLControlState> => ({
    type: ESQL_CONTROL,
    order,
    variableName,
    variableType,
    selectedOptions,
    singleSelect,
    availableOptions: selectedOptions,
    title: `Control for ${variableName}`,
    width: 'medium',
    grow: false,
    controlType: EsqlControlType.STATIC_VALUES,
    esqlQuery: '',
  });

  it('should extract single-select string variable', () => {
    const panels: ControlPanelsState<ESQLControlState> = {
      panel1: createMockESQLControlPanel(
        'myVar',
        ESQLVariableType.VALUES,
        ['option1', 'option2'],
        true
      ),
    };

    const result = extractEsqlVariables(panels);
    expect(result).toEqual([
      {
        key: 'myVar',
        type: ESQLVariableType.VALUES,
        value: 'option1', // First selected value as string
      },
    ]);
  });

  it('should extract single-select numeric variable', () => {
    const panels: ControlPanelsState<ESQLControlState> = {
      panel1: createMockESQLControlPanel('numVar', ESQLVariableType.VALUES, ['123', '456'], true),
    };

    const result = extractEsqlVariables(panels);
    expect(result).toEqual([
      {
        key: 'numVar',
        type: ESQLVariableType.VALUES,
        value: 123, // First selected value converted to number
      },
    ]);
  });

  it('should extract multi-select string variables', () => {
    const panels: ControlPanelsState<ESQLControlState> = {
      panel1: createMockESQLControlPanel(
        'multiVar',
        ESQLVariableType.MULTI_VALUES,
        ['apple', 'banana', 'cherry'],
        false
      ),
    };

    const result = extractEsqlVariables(panels);
    expect(result).toEqual([
      {
        key: 'multiVar',
        type: ESQLVariableType.MULTI_VALUES,
        value: ['apple', 'banana', 'cherry'],
      },
    ]);
  });

  it('should extract multi-select numeric variables', () => {
    const panels: ControlPanelsState<ESQLControlState> = {
      panel1: createMockESQLControlPanel(
        'multiVar',
        ESQLVariableType.MULTI_VALUES,
        ['1', '2', '3'],
        false
      ),
    };

    const result = extractEsqlVariables(panels);
    expect(result).toEqual([
      {
        key: 'multiVar',
        type: ESQLVariableType.MULTI_VALUES,
        value: [1, 2, 3],
      },
    ]);
  });
});
