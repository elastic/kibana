/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../../monaco_imports';
import {
  createMonacoProvider,
  createDisposedSafeModel,
  DisposedModelAccessError,
} from './providers_factory';

describe('Providers Factory', () => {
  const nonDisposedModel = () =>
    ({
      isDisposed: () => false,
      getValue: jest.fn().mockReturnValue('query text'),
    } as unknown as monaco.editor.ITextModel);

  const disposedModel = () =>
    ({
      isDisposed: () => true,
      getValue: jest.fn(),
    } as unknown as monaco.editor.ITextModel);

  describe('createMonacoProvider', () => {
    it('returns the run function result for a usable model', async () => {
      const model = nonDisposedModel();
      const result = await createMonacoProvider({
        model,
        run: (m) => m.getValue(),
        emptyResult: 'empty',
      });
      expect(result).toBe('query text');
      expect(model.getValue).toHaveBeenCalled();
    });

    it('returns emptyResult when run uses the model after it was disposed', async () => {
      const model = disposedModel();
      const result = await createMonacoProvider({
        model,
        run: (m) => m.getValue(),
        emptyResult: '__empty__',
      });
      expect(result).toBe('__empty__');
      expect(model.getValue).not.toHaveBeenCalled();
    });

    it('re-throws when run throws an ordinary Error', async () => {
      const model = nonDisposedModel();
      await expect(
        createMonacoProvider({
          model,
          run: () => {
            throw new Error('not a disposal error');
          },
          emptyResult: null,
        })
      ).rejects.toThrow('not a disposal error');
    });
  });

  describe('createDisposedSafeModel', () => {
    it('exposes isDisposed on the proxy without going through the disposal guard', () => {
      const model = disposedModel();
      const safe = createDisposedSafeModel(model);
      expect(safe.isDisposed()).toBe(true);
    });

    it('throws DisposedModelAccessError when a disposed model property other than isDisposed is read', () => {
      const model = disposedModel();
      const safe = createDisposedSafeModel(model);
      expect(() => safe.getValue()).toThrow(DisposedModelAccessError);
    });
  });
});
