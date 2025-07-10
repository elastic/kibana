/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { render } from '@testing-library/react';

import { ControlGroupApi } from '../..';
import { DefaultControlApi } from '../../controls/types';
import { ControlGroupEditor } from './control_group_editor';
import { initializeEditorStateManager } from '../initialize_editor_state_manager';
import { DEFAULT_CONTROLS_LABEL_POSITION } from '@kbn/controls-constants';

describe('render', () => {
  const children$ = new BehaviorSubject<{ [key: string]: DefaultControlApi }>({});
  const props = {
    api: {
      children$,
    } as unknown as ControlGroupApi,
    onCancel: () => {},
    onSave: () => {},
    onDeleteAll: () => {},
    stateManager: initializeEditorStateManager({
      chainingSystem: 'HIERARCHICAL',
      autoApplySelections: true,
      ignoreParentSettings: undefined,
      labelPosition: DEFAULT_CONTROLS_LABEL_POSITION,
    }),
  };

  beforeEach(() => {
    children$.next({});
  });

  test('should not display delete all controls button when there are no controls', () => {
    const editor = render(<ControlGroupEditor {...props} />);
    expect(editor.queryByTestId('delete-all-controls-button')).not.toBeInTheDocument();
  });

  test('should display delete all controls button when there are controls', () => {
    children$.next({
      alpha: {} as unknown as DefaultControlApi,
    });
    const editor = render(<ControlGroupEditor {...props} />);
    expect(editor.queryByTestId('delete-all-controls-button')).toBeInTheDocument();
  });
});
