/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';

import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';

import { extractAndArchiveLogs } from './extract_and_archive_logs';

jest.mock('execa');
const execa = jest.requireMock('execa');

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  open: jest.fn(),
}));
const Fsp = jest.requireMock('fs/promises');

const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);

/** Stand-in for the descriptor the archived log file is opened with. */
const FD = 42;

let close: jest.Mock;

/** Reads the container name back out of an anchored `name=^<name>$` filter argument. */
const parseNameFilter = (filter: string) => filter.replace(/^name=\^/, '').replace(/\$$/, '');

/** Resolves `docker ps -a --quiet --filter name=^<name>$` to a stable id per container. */
const mockDockerCalls = (ids: Record<string, string>) => {
  execa.mockImplementation((_command: string, args: string[]) => {
    if (args[0] === 'ps' && args.includes('--quiet')) {
      const name = parseNameFilter(args[args.length - 1]);
      return Promise.resolve({ stdout: ids[name] ?? '' });
    }
    return Promise.resolve({ stdout: '' });
  });
};

beforeEach(() => {
  jest.resetAllMocks();
  log.indent(-log.getIndent());
  logWriter.messages.length = 0;

  close = jest.fn().mockResolvedValue(undefined);
  Fsp.mkdir.mockResolvedValue(undefined);
  Fsp.open.mockResolvedValue({ fd: FD, close });
});

describe('extractAndArchiveLogs', () => {
  test('streams container logs to a file without buffering them', async () => {
    mockDockerCalls({ es01: 'abc123' });

    await expect(
      extractAndArchiveLogs({ log, nodeNames: ['es01'], outputFolder: '/out' })
    ).resolves.toEqual(['es01-abc123.log']);

    expect(Fsp.mkdir).toHaveBeenCalledWith('/out', { recursive: true });
    expect(Fsp.open).toHaveBeenCalledWith(join('/out', 'es01-abc123.log'), 'w');
    expect(close).toHaveBeenCalledTimes(1);

    // Handing the descriptor to the child is what keeps execa's 100MB `maxBuffer` out of the
    // picture. Buffering the output again would fail this assertion.
    expect(execa).toHaveBeenCalledWith('docker', ['logs', 'es01'], {
      stdout: FD,
      stderr: FD,
      buffer: false,
    });
  });

  test('anchors the container name filter', async () => {
    mockDockerCalls({ uiam: 'abc123' });

    await expect(
      extractAndArchiveLogs({ log, nodeNames: ['uiam'], outputFolder: '/out' })
    ).resolves.toEqual(['uiam-abc123.log']);

    // `docker ps --filter name=uiam` matches on substring, so it also returns the ids of
    // `uiam-cosmosdb` and `uiam-oauth`, one per line, which then end up in the file name.
    expect(execa).toHaveBeenCalledWith('docker', [
      'ps',
      '-a',
      '--quiet',
      '--filter',
      'name=^uiam$',
    ]);
  });

  test('discovers the Docker nodes when no node names are given', async () => {
    execa.mockImplementation((_command: string, args: string[]) => {
      if (args.includes('{{.Names}}')) {
        return Promise.resolve({ stdout: 'es01\nuiam\n' });
      }
      const name = parseNameFilter(args[args.length - 1]);
      return Promise.resolve({ stdout: `${name}-id` });
    });

    await expect(extractAndArchiveLogs({ log, outputFolder: '/out' })).resolves.toEqual([
      'es01-es01-id.log',
      'uiam-uiam-id.log',
    ]);

    expect(execa).toHaveBeenCalledWith('docker', ['ps', '-a', '--format', '{{.Names}}']);
  });

  test('keeps archiving the remaining nodes when one of them fails, and never throws', async () => {
    const bufferedOutput = 'x'.repeat(5000);
    const maxBufferError = Object.assign(
      new Error(`Command failed with ENOBUFS: docker logs uiam\n${bufferedOutput}`),
      { shortMessage: 'Command failed with ENOBUFS: docker logs uiam' }
    );

    execa.mockImplementation((_command: string, args: string[]) => {
      if (args[0] === 'logs') {
        return args[1] === 'uiam' ? Promise.reject(maxBufferError) : Promise.resolve({});
      }
      const name = parseNameFilter(args[args.length - 1]);
      return Promise.resolve({ stdout: `${name}-id` });
    });

    await expect(
      extractAndArchiveLogs({ log, nodeNames: ['uiam', 'es01'], outputFolder: '/out' })
    ).resolves.toEqual(['es01-es01-id.log']);

    // The descriptor is released even when the child fails.
    expect(close).toHaveBeenCalledTimes(2);

    const messages = logWriter.messages.join('\n');
    expect(messages).toContain('Failed to archive logs for Docker node uiam');
    expect(messages).toContain('Command failed with ENOBUFS');
    // The full buffered log must never reach the CI output.
    expect(messages).not.toContain(bufferedOutput);
  });

  test('returns an empty list when there are no Docker nodes', async () => {
    execa.mockResolvedValue({ stdout: '' });

    await expect(extractAndArchiveLogs({ log, outputFolder: '/out' })).resolves.toEqual([]);

    expect(logWriter.messages.join('\n')).toContain('No Docker nodes found to extract logs from');
    expect(Fsp.mkdir).not.toHaveBeenCalled();
  });

  test('skips a node that no longer has a container id', async () => {
    mockDockerCalls({});

    await expect(
      extractAndArchiveLogs({ log, nodeNames: ['es01'], outputFolder: '/out' })
    ).resolves.toEqual([]);

    expect(Fsp.open).not.toHaveBeenCalled();
  });

  test('returns an empty list when the nodes cannot be listed', async () => {
    execa.mockRejectedValue(new Error('Cannot connect to the Docker daemon'));

    await expect(extractAndArchiveLogs({ log, outputFolder: '/out' })).resolves.toEqual([]);

    expect(logWriter.messages.join('\n')).toContain('Failed to list Docker nodes');
    expect(Fsp.mkdir).not.toHaveBeenCalled();
  });

  test('returns an empty list when the output folder cannot be created', async () => {
    mockDockerCalls({ es01: 'abc123' });
    Fsp.mkdir.mockRejectedValue(new Error('EACCES'));

    await expect(
      extractAndArchiveLogs({ log, nodeNames: ['es01'], outputFolder: '/out' })
    ).resolves.toEqual([]);

    expect(logWriter.messages.join('\n')).toContain('Failed to create the log output folder');
    expect(Fsp.open).not.toHaveBeenCalled();
  });

  test('falls back to the .es folder in the repo root', async () => {
    mockDockerCalls({ es01: 'abc123' });

    await expect(extractAndArchiveLogs({ log, nodeNames: ['es01'] })).resolves.toEqual([
      'es01-abc123.log',
    ]);

    expect(Fsp.mkdir).toHaveBeenCalledWith(join(REPO_ROOT, '.es'), { recursive: true });
  });
});
