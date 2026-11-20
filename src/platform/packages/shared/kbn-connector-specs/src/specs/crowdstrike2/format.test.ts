/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  baseName,
  intelVerdict,
  parseProcessTable,
  parseRtrCommand,
  retrievedFileFor,
  shapeBatchResults,
  withContainmentState,
} from './format';

const AID = '0123456789abcdef0123456789abcdef';
const SHA = 'a'.repeat(64);

describe('CrowdStrike Falcon format helpers', () => {
  it.each([
    ['normal', 'normal'],
    ['containment_pending', 'containing'],
    ['contained', 'contained'],
    ['lift_containment_pending', 'lift_pending'],
    ['something_new', 'unknown'],
    [undefined, 'unknown'],
  ])('maps containment status %s to %s and keeps the raw status', (status, state) => {
    expect(withContainmentState({ device_id: AID, status })).toEqual({
      device_id: AID,
      status,
      containment_state: state,
    });
  });

  describe('parseRtrCommand', () => {
    it('splits the base command from the whole line', () => {
      expect(parseRtrCommand('  ls C:\\Windows  ', 'read_only')).toEqual({
        baseCommand: 'ls',
        commandString: 'ls C:\\Windows',
      });
      expect(parseRtrCommand('reg query HKLM\\Software', 'read_only')).toEqual({
        baseCommand: 'reg',
        commandString: 'reg query HKLM\\Software',
      });
    });

    it.each([
      ['rm C:\\x', 'read_only'],
      ['reg set HKLM\\x v', 'read_only'],
      ['kill 42', 'read_only'],
      ['put tool.exe', 'active_responder'],
      ['run cmd.exe', 'active_responder'],
      ['format c:', 'admin'],
    ] as const)('rejects %s in the %s tier and lists the allowed commands', (command, tier) => {
      expect(() => parseRtrCommand(command, tier)).toThrow(
        /is not allowed in the .* Real Time Response tier\. Allowed commands: cat, cd/
      );
    });

    it.each([
      ['kill 42', 'active_responder'],
      ['reg delete HKLM\\x', 'active_responder'],
      ["runscript -CloudFile='collect'", 'active_responder'],
      ['put tool.exe', 'admin'],
      ['RUN cmd.exe', 'admin'],
    ] as const)('allows %s in the %s tier', (command, tier) => {
      expect(() => parseRtrCommand(command, tier)).not.toThrow();
    });
  });

  it('shapes one result per host, with cloud_request_id only for running commands', () => {
    const otherAid = 'f'.repeat(32);
    const offlineAid = 'e'.repeat(32);
    const results = shapeBatchResults(
      {
        [AID]: { session_id: 's1', errors: [] },
        [offlineAid]: {
          session_id: '',
          errors: [{ code: 40407, message: 'Sensor appears to be offline' }],
        },
      },
      {
        [AID]: {
          session_id: 's1',
          task_id: 't1',
          complete: true,
          stdout: 'bin\n',
          stderr: '',
          base_command: 'ls',
          errors: [],
        },
        [otherAid]: { session_id: 's2', task_id: 't2', complete: false, stdout: '', errors: [] },
      }
    );
    expect(results).toEqual([
      {
        host_id: AID,
        session_id: 's1',
        complete: true,
        stdout: 'bin\n',
        stderr: '',
        base_command: 'ls',
        offline_queued: false,
        errors: [],
      },
      {
        host_id: otherAid,
        session_id: 's2',
        complete: false,
        stdout: '',
        stderr: undefined,
        base_command: undefined,
        offline_queued: false,
        cloud_request_id: 't2',
        errors: [],
      },
      {
        host_id: offlineAid,
        session_id: '',
        complete: false,
        offline_queued: false,
        errors: [{ code: 40407, message: 'Sensor appears to be offline' }],
      },
    ]);
  });

  describe('retrievedFileFor', () => {
    const file = { session_id: 's1', sha256: SHA, name: 'C:\\a\\b.txt', size: 12 };
    it.each([
      ['an object per host', { resources: { [AID]: file } }],
      ['a list per host', { resources: { [AID]: [file] } }],
      [
        'a files list under combined',
        {
          combined: {
            resources: { [AID]: { session_id: 's1', files: [{ ...file, session_id: undefined }] } },
          },
        },
      ],
    ])('reads %s', (_label, data) => {
      expect(retrievedFileFor(data, AID)).toEqual(file);
    });

    it('returns undefined while the file is not ready or for another host', () => {
      expect(
        retrievedFileFor({ resources: { [AID]: { session_id: 's1', sha256: '' } } }, AID)
      ).toBeUndefined();
      expect(retrievedFileFor({ resources: { [AID]: file } }, 'f'.repeat(32))).toBeUndefined();
      expect(retrievedFileFor(undefined, AID)).toBeUndefined();
    });
  });

  it('takes the last segment of Windows and POSIX paths', () => {
    expect(baseName('C:\\Users\\a\\invoice.exe')).toBe('invoice.exe');
    expect(baseName('/tmp/x/y.sh')).toBe('y.sh');
    expect(baseName('plain')).toBe('plain');
  });

  describe('parseProcessTable', () => {
    it('parses a table using the dashed line for column boundaries', () => {
      const stdout = [
        '',
        'Name                 Id    User Name',
        '----                 --    ---------',
        'System Idle Process  0     NT AUTHORITY\\SYSTEM',
        'chrome.exe           4321  CORP\\alice',
        '',
      ].join('\r\n');
      expect(parseProcessTable(stdout)).toEqual([
        { Name: 'System Idle Process', Id: '0', 'User Name': 'NT AUTHORITY\\SYSTEM' },
        { Name: 'chrome.exe', Id: '4321', 'User Name': 'CORP\\alice' },
      ]);
    });

    it('returns no rows for output that is not a table', () => {
      expect(parseProcessTable('')).toEqual([]);
      expect(parseProcessTable('PID TTY TIME CMD\n1 ? 00:00:01 init')).toEqual([]);
    });
  });

  it.each([
    [[{ malicious_confidence: 'low' }, { malicious_confidence: 'high' }], 'high'],
    [[{ malicious_confidence: 'medium' }], 'medium'],
    [[{ malicious_confidence: 'unverified' }], 'unverified'],
    [[{ indicator: 'x' }], 'unverified'],
    [[], 'not_found'],
  ])('derives the intel verdict from %j as %s', (resources, verdict) => {
    expect(intelVerdict(resources)).toBe(verdict);
  });
});
