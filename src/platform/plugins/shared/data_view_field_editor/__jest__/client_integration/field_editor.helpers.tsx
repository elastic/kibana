/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { act } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { createRtlHelpers } from './helpers/rtl_helpers';
import { FieldEditor } from '../../public/components/field_editor/field_editor';
import { WithFieldEditorDependencies } from './helpers';
import type { Context } from '../../public/components/field_editor_context';
import type { Props } from '../../public/components/field_editor/field_editor';

export const defaultProps: Props = {
  onChange: jest.fn(),
};

const getActions = (user: UserEvent) => {
  const { createFieldEditorFields, getByTestSubjectPath, toggleFormRow } = createRtlHelpers(user);
  const userEventFields = createFieldEditorFields();

  const setInputValue = async (selector: string, value: string) => {
    const input = getByTestSubjectPath(selector) as HTMLInputElement;

    await user.clear(input);

    if (value) {
      await user.click(input);
      await user.paste(value);
    }

    await user.tab();

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
  };

  return {
    fields: {
      updateName: (value: string) => setInputValue('nameField.input', value),
      updatePopularity: userEventFields.updatePopularity,
      updateScript: (value: string) => setInputValue('scriptField', value),
      updateType: userEventFields.updateType,
    },
    toggleFormRow,
  };
};

export const setup = async (
  props?: Partial<Props>,
  deps?: Partial<Context>,
  getByNameOverride?: () => any
) => {
  const user = userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
  });

  const Component = WithFieldEditorDependencies(FieldEditor, deps, getByNameOverride);

  await act(async () => {
    renderWithI18n(<Component {...defaultProps} {...props} />);
  });

  const actions = getActions(user);

  return { actions };
};
