/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { makeAction } from '../mocks/helpers';
import { CellActionExecutionContext } from '../types';
import { ActionItem } from './cell_action_item';

describe('ActionItem', () => {
  it('renders', () => {
    const action = makeAction('test-action');
    const actionContext = {} as CellActionExecutionContext;
    const { queryByTestId } = render(
      <ActionItem action={action} actionContext={actionContext} showTooltip={false} />
    );
    expect(queryByTestId('actionItem-test-action')).toBeInTheDocument();
  });

  it('renders tooltip when showTooltip=true is received', () => {
    const action = makeAction('test-action');
    const actionContext = {} as CellActionExecutionContext;
    const { container } = render(
      <ActionItem action={action} actionContext={actionContext} showTooltip />
    );

    expect(container.querySelector('.euiToolTipAnchor')).not.toBeNull();
  });
});
