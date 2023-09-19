/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import {
  BottomBar,
  BottomBarProps,
  DATA_TEST_SUBJ_SAVE_BUTTON,
  DATA_TEST_SUBJ_CANCEL_BUTTON,
} from './bottom_bar';
import { wrap } from '../mocks';

const saveAll = jest.fn();
const clearAllUnsaved = jest.fn();

const defaultProps: BottomBarProps = {
  saveAll,
  clearAllUnsaved,
  hasInvalidChanges: false,
  unsavedChangesCount: 3,
  isLoading: false,
};

describe('BottomBar', () => {
  it('renders without errors', () => {
    const { container } = render(wrap(<BottomBar {...defaultProps} />));
    expect(container).toBeInTheDocument();
  });

  it('fires saveAll when the Save button is clicked', () => {
    const { getByTestId } = render(wrap(<BottomBar {...defaultProps} />));

    const input = getByTestId(DATA_TEST_SUBJ_SAVE_BUTTON);
    fireEvent.click(input);
    expect(saveAll).toHaveBeenCalled();
  });

  it('fires clearAllUnsaved when the Cancel button is clicked', () => {
    const { getByTestId } = render(wrap(<BottomBar {...defaultProps} />));

    const input = getByTestId(DATA_TEST_SUBJ_CANCEL_BUTTON);
    fireEvent.click(input);
    expect(saveAll).toHaveBeenCalled();
  });

  // TODO: fix this
  it.skip('renders unsaved changes count', () => {
    // const { getByTestId } = render(wrap(<BottomBar {...defaultProps} />));
    // const input = getByTestId(DATA_TEST_SUBJ_UNSAVED_COUNT);
    // expect(input).toBe('3 unsaved settings');
  });

  it('save button is disabled when there are invalid changes', () => {
    const { getByTestId } = render(
      wrap(<BottomBar {...{ ...defaultProps, hasInvalidChanges: true }} />)
    );

    const input = getByTestId(DATA_TEST_SUBJ_SAVE_BUTTON);
    expect(input).toBeDisabled();
  });

  // TODO: fix this
  it.skip('save button is loading when in loading state', () => {
    const { getByTestId } = render(wrap(<BottomBar {...{ ...defaultProps, isLoading: true }} />));

    const input = getByTestId(DATA_TEST_SUBJ_SAVE_BUTTON);
    expect(input).toBeDisabled();
  });
});
