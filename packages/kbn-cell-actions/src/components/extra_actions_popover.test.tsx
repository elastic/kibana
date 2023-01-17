/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { CellActionExecutionContext } from './cell_actions';
import { makeAction } from '../mocks/helpers';
import { ExtraActionsPopOver, ExtraActionsPopOverWithAnchor } from './extra_actions_popover';

const actionContext = { field: { name: 'fieldName' } } as CellActionExecutionContext;
describe('ExtraActionsPopOver', () => {
  it('renders', () => {
    const { queryByTestId } = render(
      <ExtraActionsPopOver
        actionContext={actionContext}
        isOpen={false}
        closePopOver={() => {}}
        actions={[]}
        button={<span />}
      />
    );

    expect(queryByTestId('extraActionsPopOver')).toBeInTheDocument();
  });

  it('executes action and close popover when menu item is clicked', async () => {
    const executeAction = jest.fn();
    const closePopOver = jest.fn();
    const action = { ...makeAction('test-action'), execute: executeAction };
    const { getByLabelText } = render(
      <ExtraActionsPopOver
        actionContext={actionContext}
        isOpen={true}
        closePopOver={closePopOver}
        actions={[action]}
        button={<span />}
      />
    );

    await act(async () => {
      await fireEvent.click(getByLabelText('test-action'));
    });

    expect(executeAction).toHaveBeenCalled();
    expect(closePopOver).toHaveBeenCalled();
  });
});

describe('ExtraActionsPopOverWithAnchor', () => {
  const anchorElement = document.createElement('span');
  document.body.appendChild(anchorElement);

  it('renders', () => {
    const { queryByTestId } = render(
      <ExtraActionsPopOverWithAnchor
        actionContext={actionContext}
        isOpen={false}
        closePopOver={() => {}}
        actions={[]}
        anchorRef={{ current: anchorElement }}
      />
    );

    expect(queryByTestId('extraActionsPopOverWithAnchor')).toBeInTheDocument();
  });

  it('executes action and close popover when menu item is clicked', () => {
    const executeAction = jest.fn();
    const closePopOver = jest.fn();
    const action = { ...makeAction('test-action'), execute: executeAction };
    const { getByLabelText } = render(
      <ExtraActionsPopOverWithAnchor
        actionContext={actionContext}
        isOpen={true}
        closePopOver={closePopOver}
        actions={[action]}
        anchorRef={{ current: anchorElement }}
      />
    );

    fireEvent.click(getByLabelText('test-action'));

    expect(executeAction).toHaveBeenCalled();
    expect(closePopOver).toHaveBeenCalled();
  });
});
