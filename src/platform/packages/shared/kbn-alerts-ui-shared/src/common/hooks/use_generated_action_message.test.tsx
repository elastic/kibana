/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useGeneratedActionMessage } from './use_generated_action_message';
import type { MessageField } from '../types/action_types';

interface TestParams {
  message: string;
}

const messageField: MessageField<TestParams> = {
  get: (params) => params.message,
  set: (params, message) => ({ message }),
};

const TEMPLATE = 'Generated: {{context.value}}';
const DEFAULT_GROUP_KEY = 'default|action';
const RECOVERY_GROUP_KEY = 'recovered|action';
const SUMMARY_GROUP_KEY = 'default|summary';

describe('useGeneratedActionMessage', () => {
  describe('no-op behavior', () => {
    it('does nothing when messageField is absent', () => {
      const onChange = jest.fn();
      renderHook(() =>
        useGeneratedActionMessage({
          template: TEMPLATE,
          groupKey: DEFAULT_GROUP_KEY,
          messageField: undefined,
          params: { message: 'anything' },
          onChange,
        })
      );
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does nothing on group change when messageField is absent', () => {
      const onChange = jest.fn();
      const { rerender } = renderHook(
        ({ groupKey }: { groupKey: string }) =>
          useGeneratedActionMessage({
            template: TEMPLATE,
            groupKey,
            messageField: undefined,
            params: { message: 'anything' },
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY } }
      );
      rerender({ groupKey: RECOVERY_GROUP_KEY });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('mount seeding', () => {
    it('does not call onChange on mount when params match the template', () => {
      const onChange = jest.fn();
      renderHook(() =>
        useGeneratedActionMessage({
          template: TEMPLATE,
          groupKey: DEFAULT_GROUP_KEY,
          messageField,
          params: { message: TEMPLATE },
          onChange,
        })
      );
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not call onChange on mount when params are blank', () => {
      const onChange = jest.fn();
      renderHook(() =>
        useGeneratedActionMessage({
          template: TEMPLATE,
          groupKey: DEFAULT_GROUP_KEY,
          messageField,
          params: { message: '' },
          onChange,
        })
      );
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not call onChange on mount when params are customized', () => {
      const onChange = jest.fn();
      renderHook(() =>
        useGeneratedActionMessage({
          template: TEMPLATE,
          groupKey: DEFAULT_GROUP_KEY,
          messageField,
          params: { message: 'My custom message' },
          onChange,
        })
      );
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('group key transitions', () => {
    it('writes the template for the new group when no saved edit exists', () => {
      const onChange = jest.fn();
      const recoveryTemplate = 'Alert recovered: {{context.value}}';

      const { rerender } = renderHook(
        ({ groupKey, template }: { groupKey: string; template: string }) =>
          useGeneratedActionMessage({
            template,
            groupKey,
            messageField,
            params: { message: TEMPLATE },
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, template: TEMPLATE } }
      );

      act(() => {
        rerender({ groupKey: RECOVERY_GROUP_KEY, template: recoveryTemplate });
      });

      expect(onChange).toHaveBeenCalledWith({ message: recoveryTemplate });
    });

    it('restores a previously saved edit for an incoming group key', () => {
      const onChange = jest.fn();
      const customEdit = 'My custom edit';
      let currentParams = { message: TEMPLATE };

      const { rerender } = renderHook(
        ({ groupKey, params }: { groupKey: string; params: { message: string } }) =>
          useGeneratedActionMessage({
            template: TEMPLATE,
            groupKey,
            messageField,
            params,
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, params: currentParams } }
      );

      // User edits the default group message
      act(() => {
        currentParams = { message: customEdit };
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      // Switch to recovery
      act(() => {
        rerender({ groupKey: RECOVERY_GROUP_KEY, params: currentParams });
      });

      onChange.mockClear();

      // Switch back to default
      act(() => {
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      expect(onChange).toHaveBeenCalledWith({ message: customEdit });
    });

    it('writes blank when template is undefined for the new group', () => {
      const onChange = jest.fn();

      const { rerender } = renderHook(
        ({ groupKey, template }: { groupKey: string; template: string | undefined }) =>
          useGeneratedActionMessage({
            template,
            groupKey,
            messageField,
            params: { message: TEMPLATE },
            onChange,
          }),
        {
          initialProps: { groupKey: DEFAULT_GROUP_KEY, template: TEMPLATE as string | undefined },
        }
      );

      act(() => {
        rerender({ groupKey: SUMMARY_GROUP_KEY, template: undefined });
      });

      expect(onChange).toHaveBeenCalledWith({ message: '' });
    });

    it('saves the outgoing customized value when switching groups', () => {
      const onChange = jest.fn();
      const customEdit = 'My custom edit';
      let currentParams = { message: TEMPLATE };

      const { rerender } = renderHook(
        ({ groupKey, params }: { groupKey: string; params: { message: string } }) =>
          useGeneratedActionMessage({
            template: TEMPLATE,
            groupKey,
            messageField,
            params,
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, params: currentParams } }
      );

      // Simulate user editing
      act(() => {
        currentParams = { message: customEdit };
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      // Switch away
      act(() => {
        rerender({ groupKey: RECOVERY_GROUP_KEY, params: currentParams });
      });

      onChange.mockClear();

      // Switch back — should restore saved edit
      act(() => {
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      expect(onChange).toHaveBeenCalledWith({ message: customEdit });
    });

    it('does not save the outgoing value when it is blank', () => {
      const onChange = jest.fn();
      const currentParams = { message: '' };

      const { rerender } = renderHook(
        ({ groupKey, params }: { groupKey: string; params: { message: string } }) =>
          useGeneratedActionMessage({
            template: TEMPLATE,
            groupKey,
            messageField,
            params,
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, params: currentParams } }
      );

      // Switch to recovery
      act(() => {
        rerender({ groupKey: RECOVERY_GROUP_KEY, params: currentParams });
      });

      onChange.mockClear();

      // Switch back to default — no saved edit, so template is written
      act(() => {
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      expect(onChange).toHaveBeenCalledWith({ message: TEMPLATE });
    });

    it('treats trailing whitespace as customized (not blank)', () => {
      const onChange = jest.fn();
      const whitespaceValue = 'custom   ';
      const currentParams = { message: whitespaceValue };

      const { rerender } = renderHook(
        ({ groupKey, params }: { groupKey: string; params: { message: string } }) =>
          useGeneratedActionMessage({
            template: TEMPLATE,
            groupKey,
            messageField,
            params,
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, params: currentParams } }
      );

      // Switch away
      act(() => {
        rerender({ groupKey: RECOVERY_GROUP_KEY, params: currentParams });
      });

      onChange.mockClear();

      // Switch back — should restore the value with trailing whitespace
      act(() => {
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      expect(onChange).toHaveBeenCalledWith({ message: whitespaceValue });
    });
  });

  describe('generated state detection', () => {
    it('does not save a generated value (exact template match) as a customized edit', () => {
      const onChange = jest.fn();
      const currentParams = { message: TEMPLATE };

      const { rerender } = renderHook(
        ({ groupKey, params }: { groupKey: string; params: { message: string } }) =>
          useGeneratedActionMessage({
            template: TEMPLATE,
            groupKey,
            messageField,
            params,
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, params: currentParams } }
      );

      // Switch away while still showing template
      act(() => {
        rerender({ groupKey: RECOVERY_GROUP_KEY, params: currentParams });
      });

      onChange.mockClear();

      // Switch back — no saved edit, so template is written again
      act(() => {
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      expect(onChange).toHaveBeenCalledWith({ message: TEMPLATE });
    });

    it('retyping the exact template causes it to be treated as generated on next transition', () => {
      const onChange = jest.fn();
      // Mount: message starts as template (generated)
      let currentParams = { message: TEMPLATE };

      const { rerender } = renderHook(
        ({ groupKey, params }: { groupKey: string; params: { message: string } }) =>
          useGeneratedActionMessage({
            template: TEMPLATE,
            groupKey,
            messageField,
            params,
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, params: currentParams } }
      );

      // User edits to something else
      act(() => {
        currentParams = { message: 'something else' };
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      // User retypes exact template
      act(() => {
        currentParams = { message: TEMPLATE };
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      // Switch away (the hook wrote the template on mount, so it's the lastWritten value)
      act(() => {
        rerender({ groupKey: RECOVERY_GROUP_KEY, params: currentParams });
      });

      onChange.mockClear();

      // Switch back — the retyped template was equal to lastWritten, so NOT saved as edit
      // Template is written again
      act(() => {
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      expect(onChange).toHaveBeenCalledWith({ message: TEMPLATE });
    });
  });

  describe('summary key transitions', () => {
    it('transitions between action and summary group keys', () => {
      const onChange = jest.fn();
      const summaryTemplate = 'Summary: {{context.alerts}}';
      const currentParams = { message: TEMPLATE };

      const { rerender } = renderHook(
        ({ groupKey, template }: { groupKey: string; template: string }) =>
          useGeneratedActionMessage({
            template,
            groupKey,
            messageField,
            params: currentParams,
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, template: TEMPLATE } }
      );

      act(() => {
        rerender({ groupKey: SUMMARY_GROUP_KEY, template: summaryTemplate });
      });

      expect(onChange).toHaveBeenCalledWith({ message: summaryTemplate });
    });

    it('restores edit after summary round-trip', () => {
      const onChange = jest.fn();
      const summaryTemplate = 'Summary: {{context.alerts}}';
      const customSummaryEdit = 'My custom summary';
      let currentParams = { message: TEMPLATE };

      const { rerender } = renderHook(
        ({ groupKey, template }: { groupKey: string; template: string }) =>
          useGeneratedActionMessage({
            template,
            groupKey,
            messageField,
            params: currentParams,
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, template: TEMPLATE } }
      );

      // Switch to summary
      act(() => {
        rerender({ groupKey: SUMMARY_GROUP_KEY, template: summaryTemplate });
      });

      // User edits summary
      act(() => {
        currentParams = { message: customSummaryEdit };
        rerender({ groupKey: SUMMARY_GROUP_KEY, template: summaryTemplate });
      });

      // Switch back to action
      act(() => {
        rerender({ groupKey: DEFAULT_GROUP_KEY, template: TEMPLATE });
      });

      onChange.mockClear();

      // Switch back to summary — should restore the custom edit
      act(() => {
        rerender({ groupKey: SUMMARY_GROUP_KEY, template: summaryTemplate });
      });

      expect(onChange).toHaveBeenCalledWith({ message: customSummaryEdit });
    });
  });

  describe('saved-rule regression cases', () => {
    it('seeds a saved exact-template value as generated and refreshes on group change', () => {
      const onChange = jest.fn();
      const currentParams = { message: TEMPLATE };

      const { rerender } = renderHook(
        ({ groupKey, params }: { groupKey: string; params: { message: string } }) =>
          useGeneratedActionMessage({
            template: TEMPLATE,
            groupKey,
            messageField,
            params,
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, params: currentParams } }
      );

      // Switch to recovery — the saved template matches lastWritten so no edit saved
      act(() => {
        rerender({ groupKey: RECOVERY_GROUP_KEY, params: currentParams });
      });

      onChange.mockClear();

      // Switch back — writes template again (generated, not restored from edits)
      act(() => {
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      expect(onChange).toHaveBeenCalledWith({ message: TEMPLATE });
    });

    it('seeds a saved customized value and preserves it on round-trip', () => {
      const onChange = jest.fn();
      const customValue = 'User customized content from saved rule';
      const currentParams = { message: customValue };

      const { rerender } = renderHook(
        ({ groupKey, params }: { groupKey: string; params: { message: string } }) =>
          useGeneratedActionMessage({
            template: TEMPLATE,
            groupKey,
            messageField,
            params,
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, params: currentParams } }
      );

      // Switch to recovery
      act(() => {
        rerender({ groupKey: RECOVERY_GROUP_KEY, params: currentParams });
      });

      onChange.mockClear();

      // Switch back — restores the customized value from edits
      act(() => {
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      expect(onChange).toHaveBeenCalledWith({ message: customValue });
    });

    it('clearing then switching group restores the template', () => {
      const onChange = jest.fn();
      let currentParams = { message: 'custom content' };

      const { rerender } = renderHook(
        ({ groupKey, params }: { groupKey: string; params: { message: string } }) =>
          useGeneratedActionMessage({
            template: TEMPLATE,
            groupKey,
            messageField,
            params,
            onChange,
          }),
        { initialProps: { groupKey: DEFAULT_GROUP_KEY, params: currentParams } }
      );

      // User clears the field
      act(() => {
        currentParams = { message: '' };
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      // Switch to recovery (blank is not saved as edit)
      act(() => {
        rerender({ groupKey: RECOVERY_GROUP_KEY, params: currentParams });
      });

      onChange.mockClear();

      // Switch back to default — blank was not saved, so template is written
      act(() => {
        rerender({ groupKey: DEFAULT_GROUP_KEY, params: currentParams });
      });

      expect(onChange).toHaveBeenCalledWith({ message: TEMPLATE });
    });
  });
});
