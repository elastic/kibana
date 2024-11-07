/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This data blob has 3 key/values set:
 *  - foo: "turbo2000"
 *  - bar: {"sub": 0}
 *  - num: 12345
 */
const mockKeystoreData =
  '1:ae/OomiywlzhXnR8DnGLHheyAklj4WcvDUOzeIyeQIHEmrY' +
  'MIYOYHvduos7NDOgw3TFAuh7xs6z9i0juEo1zFeJeIr8yoyIxdGi1J8GUCO0/' +
  'OeaKxvLjTjczwoxiy34kM6CzlnJhjwnALAMiBvbehMUaCVzxf3Fu/3Gk2qeux0OPhidJ4Pn/RPjdMA==';

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation(() => JSON.stringify(mockKeystoreData)),
  existsSync: jest.fn().mockImplementation((fileName) => {
    if (fileName === 'non-existent-file.txt') {
      return false;
    } else {
      return true;
    }
  }),
  writeFileSync: jest.fn(),
}));

jest.mock('../cli/logger');

import { Logger } from '../cli/logger';
const mockLogFn = jest.fn();
Logger.prototype.log = mockLogFn;
const mockErrFn = jest.fn();
Logger.prototype.error = mockErrFn;

import { Keystore } from '../cli/keystore';
import { show } from './show';

describe('Kibana keystore: show', () => {
  let keystore: Keystore;

  beforeAll(async () => {
    keystore = new Keystore('mock-path', '');
  });

  it('reads stored strings', async () => {
    const exitCode = await show(keystore, 'foo', {});

    expect(exitCode).toBe(0);
    expect(mockLogFn).toHaveBeenCalledWith('turbo2000');
    expect(mockErrFn).not.toHaveBeenCalled();
  });

  it('reads stored numbers', async () => {
    const exitCode = await show(keystore, 'num', {});

    expect(exitCode).toBe(0);
    expect(mockLogFn).toHaveBeenCalledWith('12345');
    expect(mockErrFn).not.toHaveBeenCalled();
  });

  it('reads stored objecs', async () => {
    const exitCode = await show(keystore, 'bar', {});

    expect(exitCode).toBe(0);
    expect(mockLogFn).toHaveBeenCalledWith(JSON.stringify({ sub: 0 }));
    expect(mockErrFn).not.toHaveBeenCalled();
  });

  it('outputs to a file when the arg is passed', async () => {
    const exitCode = await show(keystore, 'foo', { output: 'non-existent-file.txt' });

    expect(exitCode).toBe(0);
    expect(mockLogFn).toHaveBeenCalledWith('Writing output to file: non-existent-file.txt');
    expect(mockErrFn).not.toHaveBeenCalled();
  });

  it('logs and terminates with an error when output file exists', async () => {
    const exitCode = await show(keystore, 'foo', { output: 'existing-file.txt' });

    expect(exitCode).toBe(-1);
    expect(mockErrFn).toHaveBeenCalledWith(
      'ERROR: Output file already exists. Remove it before retrying.'
    );
    expect(mockLogFn).not.toHaveBeenCalled();
  });

  it("logs and terminates with an error when the store doesn't have the key", async () => {
    const exitCode = await show(keystore, 'no-key');

    expect(exitCode).toBe(-1);
    expect(mockErrFn).toHaveBeenCalledWith("ERROR: Kibana keystore doesn't have requested key.");
    expect(mockLogFn).not.toHaveBeenCalled();
  });

  afterEach(() => {
    mockLogFn.mockReset();
    mockErrFn.mockReset();
    jest.clearAllMocks();
  });
});
