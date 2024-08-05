/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RulePageFooter } from './rule_page_footer';
import {
  RULE_PAGE_FOOTER_CANCEL_TEXT,
  RULE_PAGE_FOOTER_CREATE_TEXT,
  RULE_PAGE_FOOTER_SAVE_TEXT,
  RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT,
} from '../translations';

jest.mock('../validation/validate_form', () => ({
  hasRuleErrors: jest.fn(),
}));

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
}));

const { hasRuleErrors } = jest.requireMock('../validation/validate_form');
const { useRuleFormState } = jest.requireMock('../hooks');

const onSave = jest.fn();
const onCancel = jest.fn();

hasRuleErrors.mockReturnValue(false);
useRuleFormState.mockReturnValue({
  baseErrors: {},
  paramsErrors: {},
});

describe('rulePageFooter', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders create footer correctly', () => {
    render(<RulePageFooter onSave={onSave} onCancel={onCancel} />);

    expect(screen.getByText(RULE_PAGE_FOOTER_CANCEL_TEXT)).toBeInTheDocument();
    expect(screen.getByText(RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT)).toBeInTheDocument();
    expect(screen.getByText(RULE_PAGE_FOOTER_CREATE_TEXT)).toBeInTheDocument();
  });

  test('renders edit footer correctly', () => {
    render(<RulePageFooter isEdit onSave={onSave} onCancel={onCancel} />);

    expect(screen.getByText(RULE_PAGE_FOOTER_CANCEL_TEXT)).toBeInTheDocument();
    expect(screen.getByText(RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT)).toBeInTheDocument();
    expect(screen.getByText(RULE_PAGE_FOOTER_SAVE_TEXT)).toBeInTheDocument();
  });

  test('should open show request modal when the button is clicked', () => {
    render(<RulePageFooter onSave={onSave} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('rulePageFooterShowRequestButton'));
    expect(screen.getByTestId('rulePageShowRequestModal')).toBeInTheDocument();
  });

  test('should show create rule confirmation', () => {
    render(<RulePageFooter onSave={onSave} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('rulePageFooterSaveButton'));
    expect(screen.getByTestId('rulePageConfirmCreateRule')).toBeInTheDocument();
  });

  test('should show call onSave if clicking rule confirmation', () => {
    render(<RulePageFooter onSave={onSave} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('rulePageFooterSaveButton'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    expect(onSave).toHaveBeenCalled();
  });

  test('should cancel when the cancel button is clicked', () => {
    render(<RulePageFooter onSave={onSave} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('rulePageFooterCancelButton'));
    expect(onCancel).toHaveBeenCalled();
  });

  test('should disable buttons when saving', () => {
    render(<RulePageFooter isSaving onSave={onSave} onCancel={onCancel} />);

    expect(screen.getByTestId('rulePageFooterCancelButton')).toBeDisabled();
    expect(screen.getByTestId('rulePageFooterShowRequestButton')).toBeDisabled();
    expect(screen.getByTestId('rulePageFooterSaveButton')).toBeDisabled();
  });

  test('should disable save and show request buttons when there is an error', () => {
    hasRuleErrors.mockReturnValue(true);
    render(<RulePageFooter onSave={onSave} onCancel={onCancel} />);

    expect(screen.getByTestId('rulePageFooterShowRequestButton')).toBeDisabled();
    expect(screen.getByTestId('rulePageFooterSaveButton')).toBeDisabled();
    expect(screen.getByTestId('rulePageFooterCancelButton')).not.toBeDisabled();
  });
});
