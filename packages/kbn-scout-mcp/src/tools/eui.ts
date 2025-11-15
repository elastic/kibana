/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutSession } from '../session';
import type { EuiComponentParams, ToolResult } from '../types';
import { success, error, executeSafely } from '../utils';

/**
 * Whitelist of allowed actions per EUI component
 */
const ALLOWED_EUI_ACTIONS: Record<string, string[]> = {
  comboBox: [
    'selectSingleOption',
    'selectMultiOption',
    'selectMultiOptions',
    'setCustomSingleOption',
    'setCustomMultiOption',
    'removeOption',
    'clear',
    'getSelectedValue',
    'getSelectedMultiOptions',
  ],
  checkBox: ['check', 'uncheck', 'isChecked'],
  dataGrid: ['getRowCount', 'getColumnCount', 'getCellValue', 'clickCell', 'sortByColumn'],
  selectable: ['selectOption', 'selectOptions', 'getSelectedOptions'],
  toast: ['getText', 'dismiss'],
};

/**
 * Interact with EUI components
 */
export async function scoutEuiComponent(
  session: ScoutSession,
  params: EuiComponentParams
): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  if (!params.testSubj && !params.selector) {
    return error('Either testSubj or selector parameter must be provided');
  }

  // Validate action is in whitelist
  const allowedActions = ALLOWED_EUI_ACTIONS[params.component];
  if (!allowedActions || !allowedActions.includes(params.action)) {
    return error(
      `Action '${params.action}' is not allowed on component '${
        params.component
      }'. Allowed actions: ${allowedActions?.join(', ') || 'none'}`
    );
  }

  return executeSafely(async () => {
    const selector = params.testSubj
      ? { dataTestSubj: params.testSubj }
      : { locator: params.selector! };

    // Get or create the EUI component wrapper
    const component = await session.createEuiComponent(params.component, selector);

    if (!component) {
      throw new Error(`Failed to create EUI component: ${params.component}`);
    }

    // Execute the action
    const actionParams = params.params || {};
    const result = await executeEuiAction(component, params.action, actionParams);

    return {
      component: params.component,
      action: params.action,
      result,
      message: `Executed ${params.component}.${params.action}`,
    };
  }, 'EUI component interaction failed');
}

/**
 * Execute an action on an EUI component
 */
async function executeEuiAction(component: any, action: string, params: any): Promise<any> {
  switch (action) {
    // ComboBox actions
    case 'selectSingleOption':
      return await component.selectSingleOption(params.value);
    case 'selectMultiOption':
      return await component.selectMultiOption(params.value);
    case 'selectMultiOptions':
      return await component.selectMultiOptions(params.values);
    case 'setCustomSingleOption':
      return await component.setCustomSingleOption(params.value);
    case 'setCustomMultiOption':
      return await component.setCustomMultiOption(params.value);
    case 'removeOption':
      return await component.removeOption(params.value);
    case 'clear':
      return await component.clear();
    case 'getSelectedValue':
      return await component.getSelectedValue();
    case 'getSelectedMultiOptions':
      return await component.getSelectedMultiOptions();

    // CheckBox actions
    case 'check':
      return await component.check();
    case 'uncheck':
      return await component.uncheck();
    case 'isChecked':
      return await component.isChecked();

    // DataGrid actions
    case 'getRowCount':
      return await component.getRowCount();
    case 'getColumnCount':
      return await component.getColumnCount();
    case 'getCellValue':
      return await component.getCellValue(params.row, params.column);
    case 'clickCell':
      return await component.clickCell(params.row, params.column);
    case 'sortByColumn':
      return await component.sortByColumn(params.column);

    // Selectable actions
    case 'selectOption':
      return await component.selectOption(params.value);
    case 'selectOptions':
      return await component.selectOptions(params.values);
    case 'getSelectedOptions':
      return await component.getSelectedOptions();

    default:
      throw new Error(`Unknown action: ${action} for EUI component`);
  }
}

/**
 * List available EUI components and their actions
 */
export async function scoutListEuiComponents(): Promise<ToolResult> {
  return success({
    components: {
      comboBox: {
        description: 'EUI ComboBox component wrapper',
        actions: [
          'selectSingleOption(value: string) - Select a single option',
          'selectMultiOption(value: string) - Add an option to multi-select',
          'selectMultiOptions(values: string[]) - Add multiple options',
          'setCustomSingleOption(value: string) - Set custom single value',
          'setCustomMultiOption(value: string) - Add custom multi value',
          'removeOption(value: string) - Remove an option',
          'clear() - Clear all selections',
          'getSelectedValue() - Get selected value (single)',
          'getSelectedMultiOptions() - Get selected values (multi)',
        ],
      },
      checkBox: {
        description: 'EUI CheckBox component wrapper',
        actions: [
          'check() - Check the checkbox',
          'uncheck() - Uncheck the checkbox',
          'isChecked() - Check if checkbox is checked',
        ],
      },
      dataGrid: {
        description: 'EUI DataGrid component wrapper',
        actions: [
          'getRowCount() - Get number of rows',
          'getColumnCount() - Get number of columns',
          'getCellValue(row: number, column: number) - Get cell value',
          'clickCell(row: number, column: number) - Click a cell',
          'sortByColumn(column: number) - Sort by column',
        ],
      },
      selectable: {
        description: 'EUI Selectable component wrapper',
        actions: [
          'selectOption(value: string) - Select an option',
          'selectOptions(values: string[]) - Select multiple options',
          'getSelectedOptions() - Get selected options',
        ],
      },
    },
  });
}
