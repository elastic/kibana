/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../../../monaco_imports';
import {
  createMonacoProvider,
  createDisposedSafeModel,
  createCancellableCallbacks,
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

    it('throws ProviderEmptyResultErrorCode when a disposed model property other than isDisposed is read', () => {
      const model = disposedModel();
      const safe = createDisposedSafeModel(model);
      expect(() => safe.getValue()).toThrow(
        expect.objectContaining({ code: 'DisposedModelAccessError' })
      );
    });
  });

  describe('createCancellableCallbacks', () => {
    it('returns emptyResult when the token is already cancelled before any callback runs', async () => {
      const tokenSource = new monaco.CancellationTokenSource();
      tokenSource.cancel();

      const callbacks = {
        getSources: jest.fn(async () => []),
        getVariables: jest.fn().mockReturnValue({}),
      };

      const providerPromise = createMonacoProvider({
        model: nonDisposedModel(),
        run: async () => {
          const cancellableCallbacks = createCancellableCallbacks(callbacks, tokenSource.token);
          await cancellableCallbacks.getSources();
          return 'full-result';
        },
        emptyResult: '__empty__',
      });

      await expect(providerPromise).resolves.toBe('__empty__');
      expect(callbacks.getSources).not.toHaveBeenCalled();
      expect(callbacks.getVariables).not.toHaveBeenCalled();
    });

    it('returns emptyResult when the Monaco token is cancelled on the middle of the provider execution, and cuts the execution', async () => {
      const tokenSource = new monaco.CancellationTokenSource();

      const callbacks = {
        getSources: jest.fn(async () => []),
        getVariables: jest.fn().mockReturnValue({}),
      };
      const providerPromise = createMonacoProvider({
        model: nonDisposedModel(),
        run: async () => {
          const cancellableCallbacks = createCancellableCallbacks(callbacks, tokenSource.token);
          await cancellableCallbacks.getSources();
          tokenSource.cancel();
          await cancellableCallbacks.getVariables();
          return 'full-result';
        },
        emptyResult: '__empty__',
      });

      await expect(providerPromise).resolves.toBe('__empty__');
      expect(callbacks.getSources).toHaveBeenCalled();
      expect(callbacks.getVariables).not.toHaveBeenCalled();
    });
  });
});
