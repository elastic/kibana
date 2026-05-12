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
import { act, type RenderResult } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { within } from '@testing-library/react';
import type { Context } from '../../../public/components/field_editor_context';
import type { Props } from '../../../public/components/field_editor_flyout_content';
import { FieldEditorFlyoutContent } from '../../../public/components/field_editor_flyout_content';
import { WithFieldEditorDependencies } from '.';

type FormRow = 'customDescription' | 'customLabel' | 'format' | 'popularity' | 'value';

interface FieldEditorFieldsOptions {
  getTypeValue?: (value: string) => string;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const flushDocumentsAndPreviewTimers = async () => {
  await flushPreviewAndSearchTimers();

  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
};

export const flushFormValidation = async () => {
  await act(async () => {
    jest.advanceTimersByTime(0);
  });
};

export const flushPreviewAndSearchTimers = async () => {
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
};

export const queryAllByTestSubjectPath = (root: HTMLElement, selector: string): HTMLElement[] => {
  const parts = selector.split('.');
  let currentRoots = [root];

  parts.forEach((part) => {
    currentRoots = currentRoots.flatMap((currentRoot) =>
      within(currentRoot).queryAllByTestId(new RegExp(`(^|\\s)${escapeRegExp(part)}(\\s|$)`))
    );
  });

  return currentRoots;
};

export const setupFieldEditorFlyout = async <Actions>(
  props: Partial<Props> | undefined,
  deps: Partial<Context> | undefined,
  defaultProps: Props,
  getActions: (renderResult: RenderResult, user: UserEvent) => Actions
) => {
  const user = userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
  });

  const Component = WithFieldEditorDependencies(FieldEditorFlyoutContent, deps);
  let renderResult: RenderResult;

  await act(async () => {
    renderResult = renderWithI18n(React.createElement(Component, { ...defaultProps, ...props }));
  });

  const actions = getActions(renderResult!, user);

  return {
    ...renderResult!,
    actions,
    user,
  };
};

export const createRtlHelpers = (renderResult: RenderResult, user: UserEvent) => {
  const { container } = renderResult;

  const existsByTestSubjectPath = (selector: string) =>
    queryAllByTestSubjectPathScoped(selector).length > 0;

  const getByTestSubjectPath = (selector: string, root?: HTMLElement): HTMLElement => {
    const element = queryByTestSubjectPath(selector, root);

    if (!element) throw new Error(`Unable to find element with test subject "${selector}".`);

    return element;
  };

  const getTextByTestSubjectPath = (selector: string, root?: HTMLElement) =>
    queryAllByTestSubjectPathScoped(selector, root)
      .map((element) => element.textContent ?? '')
      .join('');

  const queryByTestSubjectPath = (selector: string, root?: HTMLElement): HTMLElement | undefined =>
    queryAllByTestSubjectPathScoped(selector, root)[0];

  const queryAllByTestSubjectPathScoped = (selector: string, root: HTMLElement = container) =>
    queryAllByTestSubjectPath(root, selector);

  const setInputValue = async (selector: string, value: string) => {
    const input = getByTestSubjectPath(selector) as HTMLInputElement;

    await user.clear(input);

    if (value) {
      await user.click(input);
      await user.paste(value);
    }
  };

  const toggleFormRow = async (row: FormRow, value: 'on' | 'off' = 'on') => {
    const testSubj = `${row}Row.toggle`;
    const toggle = getByTestSubjectPath(testSubj);
    const isOn = toggle.getAttribute('aria-checked') === 'true';

    if ((value === 'on' && isOn) || (value === 'off' && isOn === false)) return;

    await user.click(toggle);

    await flushFormValidation();
  };

  const createFieldEditorFields = ({
    getTypeValue = (value: string) => value,
  }: FieldEditorFieldsOptions = {}) => {
    const updateName = async (value: string) => {
      await setInputValue('nameField.input', value);

      await flushFormValidation();
    };

    const updatePopularity = async (value: string) => {
      await setInputValue('editorFieldCount', value);

      await flushFormValidation();
    };

    const updateScript = async (value: string) => {
      await setInputValue('scriptField', value);

      await flushFormValidation();
    };

    const updateType = async (value: string) => {
      await setInputValue('typeField', getTypeValue(value));

      await flushFormValidation();
    };

    return {
      updateName,
      updatePopularity,
      updateScript,
      updateType,
    };
  };

  return {
    createFieldEditorFields,
    existsByTestSubjectPath,
    getByTestSubjectPath,
    getTextByTestSubjectPath,
    queryAllByTestSubjectPath: queryAllByTestSubjectPathScoped,
    queryByTestSubjectPath,
    setInputValue,
    toggleFormRow,
  };
};
