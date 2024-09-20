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

import { ControlGroupApi } from '../../..';
import {
  ControlGroupChainingSystem,
  ControlLabelPosition,
  DEFAULT_CONTROL_LABEL_POSITION,
  ParentIgnoreSettings,
} from '../../../../common';
import { DefaultControlApi } from '../../controls/types';
import { ControlGroupEditor } from './control_group_editor';

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
      labelPosition: new BehaviorSubject<ControlLabelPosition>(DEFAULT_CONTROL_LABEL_POSITION),
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
