/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createCopyToClipboardActionFactory } from './copy_to_clipboard';
import type { CellActionExecutionContext } from '../../types';
import type { NotificationsStart } from '@kbn/core/public';

const mockSuccessToast = jest.fn();

const mockCopy = jest.fn((text: string) => true);
jest.mock('copy-to-clipboard', () => (text: string) => mockCopy(text));

describe('Default createCopyToClipboardActionFactory', () => {
  const copyToClipboardActionFactory = createCopyToClipboardActionFactory({
    notifications: { toasts: { addSuccess: mockSuccessToast } } as unknown as NotificationsStart,
  });
  const copyToClipboardAction = copyToClipboardActionFactory({ id: 'testAction' });
  const context = {
    field: { name: 'user.name', value: 'the value', type: 'text' },
  } as CellActionExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(copyToClipboardAction.getDisplayName(context)).toEqual('Copy to Clipboard');
  });

  it('should return icon type', () => {
    expect(copyToClipboardAction.getIconType(context)).toEqual('copyClipboard');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await copyToClipboardAction.isCompatible(context)).toEqual(true);
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await copyToClipboardAction.execute(context);
      expect(mockCopy).toHaveBeenCalledWith('user.name: "the value"');
      expect(mockSuccessToast).toHaveBeenCalled();
    });

    it('should escape value', async () => {
      await copyToClipboardAction.execute({
        ...context,
        field: { ...context.field, value: 'the "value"' },
      });
      expect(mockCopy).toHaveBeenCalledWith('user.name: "the \\"value\\""');
      expect(mockSuccessToast).toHaveBeenCalled();
    });

    it('should suport multiple values', async () => {
      await copyToClipboardAction.execute({
        ...context,
        field: { ...context.field, value: ['the "value"', 'another value', 'last value'] },
      });
      expect(mockCopy).toHaveBeenCalledWith(
        'user.name: "the \\"value\\"" AND "another value" AND "last value"'
      );
      expect(mockSuccessToast).toHaveBeenCalled();
    });
  });
});
