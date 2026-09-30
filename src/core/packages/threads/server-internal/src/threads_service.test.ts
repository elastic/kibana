/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Worker } from 'node:worker_threads';
import { ThreadsService } from './threads_service';

jest.mock('node:worker_threads');

const WorkerMock = jest.mocked(Worker);

describe('ThreadsService', () => {
  beforeEach(() => {
    WorkerMock.mockReset();
  });

  it('does not create a worker when started', () => {
    new ThreadsService().start();
    expect(WorkerMock).not.toHaveBeenCalled();
  });

  it.each(['/worker.js', new URL('file:///worker.js')])(
    'forwards the entry %s and options unchanged and returns the worker',
    (entry) => {
      const threads = new ThreadsService().start();
      const options = {
        workerData: { heartbeat: new SharedArrayBuffer(8) },
        name: 'diagnostic',
        resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
        stdout: false,
        stderr: false,
      };
      const worker = threads.createWorker(entry, options);
      expect(WorkerMock).toHaveBeenCalledWith(entry, options);
      expect(WorkerMock.mock.calls[0][1]).toBe(options);
      expect(worker).toBe(WorkerMock.mock.instances[0]);
      expect(worker.unref).not.toHaveBeenCalled();
      expect(worker.terminate).not.toHaveBeenCalled();
    }
  );

  it('creates a separate worker for each call without requiring options', () => {
    const threads = new ThreadsService().start();
    const first = threads.createWorker('/worker.js');
    const second = threads.createWorker('/worker.js');
    expect(WorkerMock).toHaveBeenCalledTimes(2);
    expect(WorkerMock).toHaveBeenCalledWith('/worker.js', undefined);
    expect(first).not.toBe(second);
  });

  it('leaves construction failures to the consumer', () => {
    const error = new Error('cannot start worker');
    WorkerMock.mockImplementationOnce(() => {
      throw error;
    });
    const threads = new ThreadsService().start();
    expect(() => threads.createWorker('/worker.js')).toThrow(error);
    expect(WorkerMock).toHaveBeenCalledTimes(1);
  });
});
