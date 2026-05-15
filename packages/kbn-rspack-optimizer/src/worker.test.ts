/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./run_build', () => {
  const actual = jest.requireActual<typeof import('./run_build')>('./run_build');
  return {
    ...actual,
    runBuild: jest.fn(),
  };
});

import { runBuild } from './run_build';

const processSend = jest.fn();

describe('worker', () => {
  beforeAll(async () => {
    (process as NodeJS.Process & { send?: (msg: unknown) => boolean | void }).send = processSend;
    await import('./worker');
  });

  describe('initialization', () => {
    it('sends ready on load', () => {
      expect(processSend).toHaveBeenCalledWith({ type: 'ready' });
    });
  });

  describe('handleStart', () => {
    beforeEach(() => {
      processSend.mockClear();
      jest.mocked(runBuild).mockReset();
    });

    it('calls runBuild with mapped options and default theme tags', async () => {
      jest.mocked(runBuild).mockResolvedValue({
        success: true,
        entryCount: 1,
        totalSize: 100,
      });

      (process as unknown as NodeJS.EventEmitter).emit('message', {
        type: 'start',
        options: {
          repoRoot: '/repo',
        },
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(runBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          repoRoot: '/repo',
          outputRoot: '/repo',
          watch: undefined,
          cache: undefined,
          dist: undefined,
          examples: undefined,
          themeTags: ['borealislight', 'borealisdark'],
          hmr: undefined,
          basePath: undefined,
        })
      );
      expect(jest.mocked(runBuild).mock.calls[0][0].log).toEqual(
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function),
          warning: expect.any(Function),
          success: expect.any(Function),
          debug: expect.any(Function),
          write: expect.any(Function),
        })
      );
    });

    it('maps explicit start options to runBuild', async () => {
      jest.mocked(runBuild).mockResolvedValue({
        success: true,
        entryCount: 1,
        totalSize: 0,
      });

      (process as unknown as NodeJS.EventEmitter).emit('message', {
        type: 'start',
        options: {
          repoRoot: '/r',
          outputRoot: '/out',
          watch: true,
          cache: false,
          dist: true,
          examples: true,
          themeTags: ['borealislight'],
          hmr: true,
          basePath: '/kbn',
        },
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(runBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          repoRoot: '/r',
          outputRoot: '/out',
          watch: true,
          cache: false,
          dist: true,
          examples: true,
          themeTags: ['borealislight'],
          hmr: true,
          basePath: '/kbn',
        })
      );
    });

    it('sends done with summary on success', async () => {
      jest.mocked(runBuild).mockResolvedValue({
        success: true,
        entryCount: 2,
        totalSize: 1024,
      });

      (process as unknown as NodeJS.EventEmitter).emit('message', {
        type: 'start',
        options: { repoRoot: '/repo' },
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(processSend).toHaveBeenCalledWith({
        type: 'done',
        success: true,
        summary: '2 entries, 1.0 KB',
      });
    });

    it('sends done with errors when build fails', async () => {
      jest.mocked(runBuild).mockResolvedValue({
        success: false,
        errors: ['compile failed'],
      });

      (process as unknown as NodeJS.EventEmitter).emit('message', {
        type: 'start',
        options: { repoRoot: '/repo' },
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(processSend).toHaveBeenCalledWith({
        type: 'done',
        success: false,
        errors: ['compile failed'],
      });
    });

    it('sends done with error message when runBuild throws', async () => {
      jest.mocked(runBuild).mockRejectedValue(new Error('boom'));

      (process as unknown as NodeJS.EventEmitter).emit('message', {
        type: 'start',
        options: { repoRoot: '/repo' },
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(processSend).toHaveBeenCalledWith({
        type: 'done',
        success: false,
        errors: ['boom'],
      });
    });

    it('createWorkerLog methods send log messages with correct levels', async () => {
      jest.mocked(runBuild).mockImplementation(async (opts) => {
        opts.log?.info('i');
        opts.log?.error('e');
        opts.log?.warning('w');
        opts.log?.success('s');
        opts.log?.debug('d');
        expect(opts.log?.write()).toBe(true);
        return { success: true, entryCount: 1, totalSize: 0 };
      });

      (process as unknown as NodeJS.EventEmitter).emit('message', {
        type: 'start',
        options: { repoRoot: '/repo' },
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(processSend.mock.calls).toEqual(
        expect.arrayContaining([
          [{ type: 'log', level: 'info', message: 'i' }],
          [{ type: 'log', level: 'error', message: 'e' }],
          [{ type: 'log', level: 'warning', message: 'w' }],
          [{ type: 'log', level: 'success', message: 's' }],
          [{ type: 'log', level: 'debug', message: 'd' }],
        ])
      );
    });

    it('completes successfully in watch mode without exiting (done is still sent once)', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        throw new Error(`unexpected process.exit(${code})`);
      }) as never);

      jest.mocked(runBuild).mockResolvedValue({
        success: true,
        entryCount: 1,
        totalSize: 0,
      });

      (process as unknown as NodeJS.EventEmitter).emit('message', {
        type: 'start',
        options: { repoRoot: '/repo', watch: true },
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(runBuild).toHaveBeenCalledWith(expect.objectContaining({ watch: true }));
      expect(processSend).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'done', success: true })
      );
      expect(exitSpy).not.toHaveBeenCalled();

      exitSpy.mockRestore();
    });
  });
});
