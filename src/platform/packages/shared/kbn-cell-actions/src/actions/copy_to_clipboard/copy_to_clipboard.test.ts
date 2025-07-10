/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createCopyToClipboardActionFactory } from './copy_to_clipboard';
import type { CellActionExecutionContext } from '../../types';
import type { NotificationsStart } from '@kbn/core/public';
import { KBN_FIELD_TYPES } from '@kbn/field-types';

const mockSuccessToast = jest.fn();
const mockWarningToast = jest.fn();

const mockCopy = jest.fn((text: string) => true);
jest.mock('copy-to-clipboard', () => (text: string) => mockCopy(text));

describe('Default createCopyToClipboardActionFactory', () => {
  const copyToClipboardActionFactory = createCopyToClipboardActionFactory({
    notifications: {
      toasts: { addSuccess: mockSuccessToast, addWarning: mockWarningToast },
    } as unknown as NotificationsStart,
  });
  const copyToClipboardAction = copyToClipboardActionFactory({ id: 'testAction' });
  const context = {
    data: [
      {
        field: { name: 'user.name', type: 'string' },
        value: 'the value',
      },
    ],
  } as CellActionExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(copyToClipboardAction.getDisplayName(context)).toEqual('Copy to clipboard');
  });

  it('should return icon type', () => {
    expect(copyToClipboardAction.getIconType(context)).toEqual('copyClipboard');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await copyToClipboardAction.isCompatible(context)).toEqual(true);
    });

    it('should return false if Kbn type is unsupported', async () => {
      expect(
        await copyToClipboardAction.isCompatible({
          ...context,
          data: [
            {
              ...context.data[0],
              field: { ...context.data[0].field, type: KBN_FIELD_TYPES.NUMBER_RANGE },
            },
          ],
        })
      ).toEqual(false);
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
        data: [
          {
            ...context.data[0],
            value: 'the "value"',
          },
        ],
      });
      expect(mockCopy).toHaveBeenCalledWith('user.name: "the \\"value\\""');
      expect(mockSuccessToast).toHaveBeenCalled();
    });

    it('should support multiple values', async () => {
      await copyToClipboardAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            value: ['the "value"', 'another value', 'last value'],
          },
        ],
      });
      expect(mockCopy).toHaveBeenCalledWith(
        'user.name: "the \\"value\\"" AND "another value" AND "last value"'
      );
      expect(mockSuccessToast).toHaveBeenCalled();
    });

    it('should support numbers', async () => {
      await copyToClipboardAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            value: [1, 2, 3],
          },
        ],
      });
      expect(mockCopy).toHaveBeenCalledWith('user.name: 1 AND 2 AND 3');
      expect(mockSuccessToast).toHaveBeenCalled();
    });

    it('should support booleans', async () => {
      await copyToClipboardAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            value: [true, false, true],
          },
        ],
      });
      expect(mockCopy).toHaveBeenCalledWith('user.name: true AND false AND true');
      expect(mockSuccessToast).toHaveBeenCalled();
    });

    it('should notify the user when value type is unsupported', async () => {
      await copyToClipboardAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            value: {},
          },
        ],
      });
      expect(mockCopy).not.toHaveBeenCalled();
      expect(mockWarningToast).toHaveBeenCalled();
    });
  });
});
