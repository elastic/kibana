/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RulePageConfirmCreateRule } from './rule_page_confirm_create_rule';
import {
  CONFIRM_RULE_SAVE_CONFIRM_BUTTON_TEXT,
  CONFIRM_RULE_SAVE_CANCEL_BUTTON_TEXT,
  CONFIRM_RULE_SAVE_MESSAGE_TEXT,
} from '../translations';

const onConfirmMock = jest.fn();
const onCancelMock = jest.fn();

describe('rulePageConfirmCreateRule', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<RulePageConfirmCreateRule onConfirm={onConfirmMock} onCancel={onCancelMock} />);

    expect(screen.getByTestId('rulePageConfirmCreateRule')).toBeInTheDocument();
    expect(screen.getByText(CONFIRM_RULE_SAVE_CONFIRM_BUTTON_TEXT)).toBeInTheDocument();
    expect(screen.getByText(CONFIRM_RULE_SAVE_CANCEL_BUTTON_TEXT)).toBeInTheDocument();
    expect(screen.getByText(CONFIRM_RULE_SAVE_MESSAGE_TEXT)).toBeInTheDocument();
  });

  test('can confirm rule creation', () => {
    render(<RulePageConfirmCreateRule onConfirm={onConfirmMock} onCancel={onCancelMock} />);

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    expect(onConfirmMock).toHaveBeenCalled();
  });

  test('can cancel rule creation', () => {
    render(<RulePageConfirmCreateRule onConfirm={onConfirmMock} onCancel={onCancelMock} />);

    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
    expect(onCancelMock).toHaveBeenCalled();
  });
});
