/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLVariableType } from '@kbn/esql-types';
import { type ESQLControlVariable, type ESQLControlState } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import { openLazyFlyout } from '@kbn/presentation-util';
import { ESQLControlsFlyout } from './control_flyout';

interface Context {
  queryString: string;
  core: CoreStart;
  search: ISearchGeneric;
  timefilter: TimefilterContract;
  variableType: ESQLVariableType;
  esqlVariables: ESQLControlVariable[];
  onSaveControl?: (controlState: ESQLControlState, updatedQuery: string) => Promise<void>;
  onCancelControl?: () => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
}

export function openESQLControlFlyout({
  queryString,
  core,
  search,
  timefilter,
  variableType,
  esqlVariables,
  onSaveControl,
  onCancelControl,
  cursorPosition,
  initialState,
}: Context) {
  const timeRange = timefilter.getTime();
  return openLazyFlyout({
    core,
    parentApi: search,
    loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
      return (
        <ESQLControlsFlyout
          ariaLabelledBy={ariaLabelledBy}
          queryString={queryString}
          search={search}
          initialVariableType={variableType}
          closeFlyout={closeFlyout}
          onSaveControl={onSaveControl}
          onCancelControl={onCancelControl}
          cursorPosition={cursorPosition}
          initialState={initialState}
          esqlVariables={esqlVariables}
          timeRange={timeRange}
        />
      );
    },
    flyoutProps: {
      'data-test-subj': 'create_esql_control_flyout',
      isResizable: true,
      maxWidth: 800,
      triggerId: 'dashboard-controls-menu-button',
    },
  });
}
