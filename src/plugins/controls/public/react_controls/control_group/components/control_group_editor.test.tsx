/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { render } from '@testing-library/react';
import { ControlGroupEditor } from './control_group_editor';
import { ControlGroupApi, ControlStyle, ParentIgnoreSettings } from '../../..';
import { ControlGroupChainingSystem, DEFAULT_CONTROL_STYLE } from '../../../../common';
import { DefaultControlApi } from '../../controls/types';

describe('render', () => {
  const children$ = new BehaviorSubject<{ [key: string]: DefaultControlApi }>({});
  const props = {
    api: {
      children$,
    } as unknown as ControlGroupApi,
    onCancel: () => {},
    onSave: () => {},
    onDeleteAll: () => {},
    stateManager: {
      chainingSystem: new BehaviorSubject<ControlGroupChainingSystem>('HIERARCHICAL'),
      labelPosition: new BehaviorSubject<ControlStyle>(DEFAULT_CONTROL_STYLE),
      autoApplySelections: new BehaviorSubject<boolean>(true),
      ignoreParentSettings: new BehaviorSubject<ParentIgnoreSettings | undefined>(undefined),
    },
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
