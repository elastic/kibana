/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { InTableSearchInput } from './in_table_search_input';
import { INPUT_TEST_SUBJ, BUTTON_PREV_TEST_SUBJ, BUTTON_NEXT_TEST_SUBJ } from './constants';

describe('InTableSearchInput', () => {
  it('renders input', async () => {
    const goToPrevMatch = jest.fn();
    const goToNextMatch = jest.fn();
    const onChangeSearchTerm = jest.fn();
    const onHideInput = jest.fn();

    const { container } = render(
      <InTableSearchInput
        matchesCount={10}
        activeMatchPosition={5}
        isProcessing={false}
        goToPrevMatch={goToPrevMatch}
        goToNextMatch={goToNextMatch}
        onChangeSearchTerm={onChangeSearchTerm}
        onHideInput={onHideInput}
      />
    );

    const prevButton = screen.getByTestId(BUTTON_PREV_TEST_SUBJ);
    expect(prevButton).toBeEnabled();
    prevButton.click();
    expect(goToPrevMatch).toHaveBeenCalled();

    const nextButton = screen.getByTestId(BUTTON_NEXT_TEST_SUBJ);
    expect(nextButton).toBeEnabled();
    nextButton.click();
    expect(goToNextMatch).toHaveBeenCalled();

    expect(container).toMatchSnapshot();
  });

  it('renders input when loading', async () => {
    const goToPrevMatch = jest.fn();
    const goToNextMatch = jest.fn();
    const onChangeSearchTerm = jest.fn();
    const onHideInput = jest.fn();

    const { container } = render(
      <InTableSearchInput
        matchesCount={null}
        activeMatchPosition={null}
        isProcessing={true}
        goToPrevMatch={goToPrevMatch}
        goToNextMatch={goToNextMatch}
        onChangeSearchTerm={onChangeSearchTerm}
        onHideInput={onHideInput}
      />
    );

    expect(screen.getByTestId(BUTTON_PREV_TEST_SUBJ)).toBeDisabled();
    expect(screen.getByTestId(BUTTON_NEXT_TEST_SUBJ)).toBeDisabled();

    expect(container).toMatchSnapshot();
  });

  it('handles changes', async () => {
    const goToPrevMatch = jest.fn();
    const goToNextMatch = jest.fn();
    const onChangeSearchTerm = jest.fn();
    const onHideInput = jest.fn();

    render(
      <InTableSearchInput
        matchesCount={1}
        activeMatchPosition={10}
        isProcessing={false}
        goToPrevMatch={goToPrevMatch}
        goToNextMatch={goToNextMatch}
        onChangeSearchTerm={onChangeSearchTerm}
        onHideInput={onHideInput}
      />
    );

    const input = screen.getByTestId(INPUT_TEST_SUBJ);
    fireEvent.change(input, { target: { value: 'test' } });
    expect(input).toHaveValue('test');

    await waitFor(() => {
      expect(onChangeSearchTerm).toHaveBeenCalledWith('test');
    });
  });

  it('hides on Escape', async () => {
    const goToPrevMatch = jest.fn();
    const goToNextMatch = jest.fn();
    const onChangeSearchTerm = jest.fn();
    const onHideInput = jest.fn();

    render(
      <InTableSearchInput
        matchesCount={1}
        activeMatchPosition={10}
        isProcessing={false}
        goToPrevMatch={goToPrevMatch}
        goToNextMatch={goToNextMatch}
        onChangeSearchTerm={onChangeSearchTerm}
        onHideInput={onHideInput}
      />
    );

    const input = screen.getByTestId(INPUT_TEST_SUBJ);
    fireEvent.keyUp(input, { key: 'Escape' });

    expect(onHideInput).toHaveBeenCalledWith(true);
  });

  it('handles prev/next with keyboard shortcuts', async () => {
    const goToPrevMatch = jest.fn();
    const goToNextMatch = jest.fn();
    const onChangeSearchTerm = jest.fn();
    const onHideInput = jest.fn();

    render(
      <InTableSearchInput
        matchesCount={1}
        activeMatchPosition={10}
        isProcessing={false}
        goToPrevMatch={goToPrevMatch}
        goToNextMatch={goToNextMatch}
        onChangeSearchTerm={onChangeSearchTerm}
        onHideInput={onHideInput}
      />
    );

    const input = screen.getByTestId(INPUT_TEST_SUBJ);
    fireEvent.keyUp(input, { key: 'Enter' });

    expect(goToNextMatch).toHaveBeenCalled();

    fireEvent.keyUp(input, { key: 'Enter', shiftKey: true });

    expect(goToPrevMatch).toHaveBeenCalled();
  });
});
