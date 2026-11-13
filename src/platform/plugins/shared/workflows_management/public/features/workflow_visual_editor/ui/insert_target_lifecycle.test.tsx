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
import { ListField } from './list_field';
import { ReferenceCapableField } from './reference_capable_field';
import { ReferenceValueBox } from './reference_value_box';
import { insertIntoActiveDataReferenceTarget } from '../../../shared/lib/active_data_reference_insert_target';
import { TestProvider } from '../../../shared/mocks/test_providers';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';

/**
 * Click-to-insert from the execution flyout targets "the last field that had focus", and the
 * flyout steals focus, so a field must stay the target after blur and across the re-renders its
 * parent makes on every keystroke. It must receive the *latest* handler, and stop being a target
 * once it unmounts.
 */
const catalog: DataReferenceCatalog = { groups: [] };

describe('click-to-insert target lifecycle', () => {
  describe('ReferenceValueBox', () => {
    const box = (onChange: (next: string | undefined) => void) => (
      <ReferenceValueBox
        catalog={catalog}
        value={undefined}
        form="text"
        onChange={onChange}
        ariaLabel="Index"
        data-test-subj="box"
      />
    );

    it('stays the target when its parent re-renders with a new handler, and uses that handler', () => {
      const first = jest.fn();
      const latest = jest.fn();
      const { rerender } = render(box(first), { wrapper: TestProvider });
      fireEvent.focus(screen.getByTestId('box-pick'));

      rerender(box(latest));

      expect(insertIntoActiveDataReferenceTarget('{{ a }}')).toBe(true);
      expect(latest).toHaveBeenCalledWith('{{ a }}');
      expect(first).not.toHaveBeenCalled();
    });

    it('stops being the target once it unmounts', () => {
      const { unmount } = render(box(jest.fn()), { wrapper: TestProvider });
      fireEvent.focus(screen.getByTestId('box-pick'));
      unmount();
      expect(insertIntoActiveDataReferenceTarget('{{ a }}')).toBe(false);
    });
  });

  describe('ListField', () => {
    const list = (onInsertReference: (token: string) => void) => (
      <ListField
        value={['a']}
        onChange={jest.fn()}
        acceptsSingle={false}
        catalog={catalog}
        onInsertReference={onInsertReference}
        ariaLabel="Ids"
        isInvalid={false}
        onBlur={jest.fn()}
        data-test-subj="list"
      />
    );

    it('stays the target when its parent re-renders with a new handler, and uses that handler', () => {
      const first = jest.fn();
      const latest = jest.fn();
      const { rerender } = render(list(first), { wrapper: TestProvider });
      fireEvent.focus(screen.getByTestId('list'));

      rerender(list(latest));

      expect(insertIntoActiveDataReferenceTarget('{{ a }}')).toBe(true);
      expect(latest).toHaveBeenCalledWith('{{ a }}');
      expect(first).not.toHaveBeenCalled();
    });

    it('stops being the target once it unmounts', () => {
      const { unmount } = render(list(jest.fn()), { wrapper: TestProvider });
      fireEvent.focus(screen.getByTestId('list'));
      unmount();
      expect(insertIntoActiveDataReferenceTarget('{{ a }}')).toBe(false);
    });
  });

  describe('ReferenceCapableField', () => {
    const field = (value: string, onChange: (next: string) => void) => (
      <ReferenceCapableField catalog={catalog} value={value} onChange={onChange}>
        {({ value: text, reportChange, attachInputRef }) => (
          <input
            data-test-subj="field"
            value={text}
            ref={attachInputRef}
            onChange={(event) =>
              reportChange(event.target.value, event.target.selectionStart ?? text.length)
            }
          />
        )}
      </ReferenceCapableField>
    );

    let execCommand: jest.Mock;
    beforeEach(() => {
      execCommand = jest.fn().mockReturnValue(true);
      Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    });

    it('stays the target after the value changes, which re-renders it on every keystroke', () => {
      const { rerender } = render(field('a', jest.fn()), { wrapper: TestProvider });
      fireEvent.focus(screen.getByTestId('field'));

      // The parent stores the typed text and re-renders the field with it.
      rerender(field('ab', jest.fn()));

      act(() => {
        expect(insertIntoActiveDataReferenceTarget('{{ a }}')).toBe(true);
      });
      expect(execCommand).toHaveBeenCalledWith('insertText', false, '{{ a }}');
    });

    it('stops being the target once it unmounts', () => {
      const { unmount } = render(field('a', jest.fn()), { wrapper: TestProvider });
      fireEvent.focus(screen.getByTestId('field'));
      unmount();
      expect(insertIntoActiveDataReferenceTarget('{{ a }}')).toBe(false);
    });
  });
});
