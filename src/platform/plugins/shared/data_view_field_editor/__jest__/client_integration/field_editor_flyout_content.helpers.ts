/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, type RenderResult } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import type { Context } from '../../public/components/field_editor_context';
import type { Props } from '../../public/components/field_editor_flyout_content';
import {
  createRtlHelpers,
  flushDocumentsAndPreviewTimers,
  flushFormValidation,
  flushPreviewAndSearchTimers,
  setupFieldEditorFlyout,
} from './helpers/rtl_helpers';

const defaultProps: Props = {
  onCancel: jest.fn(),
  onSave: jest.fn(),
};

const getActions = (renderResult: RenderResult, user: UserEvent) => {
  const { container } = renderResult;
  const { createFieldEditorFields, getByTestSubjectPath, queryByTestSubjectPath, toggleFormRow } =
    createRtlHelpers(renderResult, user);

  const closeFlyout = async () => {
    await user.click(getByTestSubjectPath('closeFlyoutButton'));
  };

  const getErrorsMessages = () =>
    Array.from(container.querySelectorAll('.euiFormErrorText')).map(
      (element) => element.textContent ?? ''
    );

  const saveField = async () => {
    await act(async () => {
      fireEvent.click(getByTestSubjectPath('fieldSaveButton'));
      jest.advanceTimersByTime(0);
    });
  };

  return {
    closeFlyout,
    fields: createFieldEditorFields(),
    flushFormValidation,
    getByTestSubjectPath,
    getErrorsMessages,
    queryByTestSubjectPath,
    saveField,
    toggleFormRow,
    waitForDocumentsAndPreviewUpdate: flushDocumentsAndPreviewTimers,
    waitForUpdates: flushPreviewAndSearchTimers,
  };
};

export const setup = async (props?: Partial<Props>, deps?: Partial<Context>) => {
  return setupFieldEditorFlyout(props, deps, defaultProps, getActions);
};

export type FieldEditorFlyoutContentHarness = Awaited<ReturnType<typeof setup>>;
