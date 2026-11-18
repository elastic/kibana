/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ReferenceCapableBind } from './reference_capable_field';
import { ReferenceTextInput } from './reference_text_input';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';

jest.mock('@kbn/workflows-ui', () =>
  jest.requireActual('../test_utils/mock_workflows_ui').createWorkflowsUiModuleMock()
);

jest.mock('@kbn/code-editor', () =>
  jest.requireActual('../test_utils/mock_code_editor').createCodeEditorModuleMock()
);

const catalog: DataReferenceCatalog = { groups: [] };

const bind = (value: string, overrides: Partial<ReferenceCapableBind> = {}): ReferenceCapableBind =>
  ({
    value,
    isOpen: false,
    teachingPlaceholder: 'Type',
    appendControls: null,
    reportChange: () => undefined,
    openPickerAtRange: () => undefined,
    registerSelection: () => undefined,
    registerEditRequester: () => undefined,
    ...overrides,
  } as unknown as ReferenceCapableBind);

const renderInput = (
  onBlur: () => void,
  value: string,
  {
    onChange = () => undefined,
    ...overrides
  }: Partial<ReferenceCapableBind> & { onChange?: (...args: unknown[]) => void } = {}
) => (
  <I18nProvider>
    <ReferenceTextInput
      bind={bind(value, overrides)}
      catalog={catalog}
      ariaLabel="Value"
      isInvalid={false}
      onBlur={onBlur}
      onChange={onChange}
      testSubj="field"
      warnContainersInSentence={false}
    />
  </I18nProvider>
);

describe('ReferenceTextInput', () => {
  it('calls the latest onBlur, not the one from when the editor mounted', () => {
    const first = jest.fn();
    const latest = jest.fn();
    const { rerender } = render(renderInput(first, 'a'));
    fireEvent.focusIn(screen.getByTestId('field'));
    // Parent re-renders with a new handler (e.g. one that closes over newer row state).
    rerender(renderInput(latest, 'ab'));

    fireEvent.blur(screen.getByTestId('field'));
    expect(latest).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  describe('what it reports to the field', () => {
    it('passes the character the user typed, so a typed { can start a reference', () => {
      const onChange = jest.fn();
      render(renderInput(jest.fn(), 'Hi ', { onChange }));
      fireEvent.focusIn(screen.getByTestId('field'));

      fireEvent.change(screen.getByTestId('field'), { target: { value: 'Hi {' } });

      expect(onChange).toHaveBeenCalledWith('Hi {', 4, '{');
    });

    it('passes no typed character for a deletion', () => {
      const onChange = jest.fn();
      render(renderInput(jest.fn(), 'Hi {{', { onChange }));
      fireEvent.focusIn(screen.getByTestId('field'));

      fireEvent.change(screen.getByTestId('field'), { target: { value: 'Hi {' } });

      expect(onChange).toHaveBeenCalledWith('Hi {', 4, undefined);
    });

    it('passes no typed character for a paste', () => {
      const onChange = jest.fn();
      render(renderInput(jest.fn(), 'Hi ', { onChange }));
      fireEvent.focusIn(screen.getByTestId('field'));

      fireEvent.change(screen.getByTestId('field'), { target: { value: 'Hi {{' } });

      expect(onChange).toHaveBeenCalledWith('Hi {{', 5, undefined);
    });
  });

  it('lets the field start editing, for the insert button pressed on text that is only shown', () => {
    const registerEditRequester = jest.fn();
    render(renderInput(jest.fn(), 'abc', { registerEditRequester }));
    expect(screen.getByTestId('field')).toHaveAttribute('data-mode', 'read');
    const [[requestEdit]] = registerEditRequester.mock.calls;

    act(() => requestEdit());

    expect(screen.getByTestId('field').tagName).toBe('TEXTAREA');
  });

  it('takes the field back when it goes away', () => {
    const registerEditRequester = jest.fn();
    const { unmount } = render(renderInput(jest.fn(), 'abc', { registerEditRequester }));

    unmount();

    expect(registerEditRequester).toHaveBeenLastCalledWith(null);
  });
});
