/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { unlinkMock, renameMock, copyFileMock } from './utils.test.mocks';
import { moveFile } from './utils';

describe('moveFile', () => {
  beforeEach(() => {
    unlinkMock.mockReset();
    renameMock.mockReset();
    copyFileMock.mockReset();
  });

  it('only calls `rename` when call succeeds', async () => {
    await moveFile('from', 'to');

    expect(renameMock).toHaveBeenCalledTimes(1);
    expect(renameMock).toHaveBeenCalledWith('from', 'to');

    expect(copyFileMock).not.toHaveBeenCalled();
    expect(unlinkMock).not.toHaveBeenCalled();
  });

  const createError = (code: string) => {
    const err = new Error(code);
    (err as any).code = code;
    return err;
  };

  it('throws error if `rename` throws a non-EXDEV error', async () => {
    renameMock.mockRejectedValue(createError('something'));

    await expect(moveFile('from', 'to')).rejects.toThrowError('something');

    expect(renameMock).toHaveBeenCalledTimes(1);
    expect(copyFileMock).not.toHaveBeenCalled();
    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it('fallback to copy+unlink when `rename` throws a EXDEV error', async () => {
    renameMock.mockRejectedValue(createError('EXDEV'));

    await moveFile('from', 'to');

    expect(renameMock).toHaveBeenCalledTimes(1);
    expect(renameMock).toHaveBeenCalledWith('from', 'to');

    expect(copyFileMock).toHaveBeenCalledTimes(1);
    expect(copyFileMock).toHaveBeenCalledWith('from', 'to');

    expect(unlinkMock).toHaveBeenCalledTimes(1);
    expect(unlinkMock).toHaveBeenCalledWith('from');
  });

  it('throws if copyFile call throws', async () => {
    renameMock.mockRejectedValue(createError('EXDEV'));
    copyFileMock.mockRejectedValue(createError('anything'));

    await expect(moveFile('from', 'to')).rejects.toThrowError('anything');

    expect(renameMock).toHaveBeenCalledTimes(1);

    expect(copyFileMock).toHaveBeenCalledTimes(1);

    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it('throws if unlink call throws', async () => {
    renameMock.mockRejectedValue(createError('EXDEV'));
    unlinkMock.mockRejectedValue(createError('something-else'));

    await expect(moveFile('from', 'to')).rejects.toThrowError('something-else');

    expect(renameMock).toHaveBeenCalledTimes(1);

    expect(copyFileMock).toHaveBeenCalledTimes(1);

    expect(unlinkMock).toHaveBeenCalledTimes(1);
  });
});
