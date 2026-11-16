/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
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

const bind = (
  value: string,
  appendControls: React.ReactElement | null = null
): ReferenceCapableBind =>
  ({
    value,
    isOpen: false,
    teachingPlaceholder: 'Type',
    appendControls,
    reportChange: () => undefined,
    openPickerAtRange: () => undefined,
    registerSelection: () => undefined,
  } as unknown as ReferenceCapableBind);

const renderInput = (
  onBlur: () => void,
  value: string,
  appendControls: React.ReactElement | null = null
) => (
  <I18nProvider>
    <ReferenceTextInput
      bind={bind(value, appendControls)}
      catalog={catalog}
      ariaLabel="Value"
      isInvalid={false}
      onBlur={onBlur}
      onChange={() => undefined}
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

  it('keeps focus in the editor when a control beside it is pressed, so its caret survives for the picker', () => {
    render(
      renderInput(
        jest.fn(),
        'abc def',
        <button type="button" data-test-subj="insert">
          {'insert'}
        </button>
      )
    );
    fireEvent.focusIn(screen.getByTestId('field'));

    // A mousedown nobody cancels moves focus to the button: the editor blurs and goes away.
    const focusMoves = fireEvent.mouseDown(screen.getByTestId('insert'));

    expect(focusMoves).toBe(false);
  });
});
