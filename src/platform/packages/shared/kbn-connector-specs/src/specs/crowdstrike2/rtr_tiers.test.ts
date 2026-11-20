/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import { loggerMock } from '@kbn/logging-mocks';
import type { ActionContext } from '../../connector_spec';
import { Crowdstrike2 } from './crowdstrike2';
import { timing } from './client';
import { RTR_TIER_COMMANDS } from './constants';

const AID = '0123456789abcdef0123456789abcdef';
const RTR = 'https://api.us-2.crowdstrike.com/real-time-response';

const READ_ONLY = [
  'cat',
  'cd',
  'clear',
  'env',
  'eventlog',
  'filehash',
  'getsid',
  'help',
  'history',
  'ipconfig',
  'ls',
  'mount',
  'netstat',
  'ps',
  'reg query',
];
const ACTIVE_RESPONDER = [
  ...READ_ONLY,
  'cp',
  'encrypt',
  'get',
  'kill',
  'map',
  'memdump',
  'mkdir',
  'mv',
  'reg set',
  'reg delete',
  'reg load',
  'reg unload',
  'restart',
  'rm',
  'runscript',
  'shutdown',
  'umount',
  'unmap',
  'update',
  'xmemdump',
  'zip',
];
const ADMIN = [...ACTIVE_RESPONDER, 'put', 'put-and-run', 'run'];

const ACTIONS = [
  { name: 'executeRTRCommand', tier: 'read-only', route: 'batch-command' },
  {
    name: 'batchActiveResponderExecuteRTR',
    tier: 'active responder',
    route: 'batch-active-responder-command',
  },
  { name: 'batchAdminExecuteRTR', tier: 'administrator', route: 'batch-admin-command' },
] as const;
type ActionName = (typeof ACTIONS)[number]['name'];

/** The scope change 3 table: which action accepts which command. */
const TABLE: Array<[string, Record<ActionName, boolean>]> = [
  [
    'umount /mnt/x',
    { executeRTRCommand: false, batchActiveResponderExecuteRTR: true, batchAdminExecuteRTR: true },
  ],
  [
    'put-and-run tool.exe',
    { executeRTRCommand: false, batchActiveResponderExecuteRTR: false, batchAdminExecuteRTR: true },
  ],
  [
    'put tool.exe',
    { executeRTRCommand: false, batchActiveResponderExecuteRTR: false, batchAdminExecuteRTR: true },
  ],
  [
    'run C:\\tool.exe',
    { executeRTRCommand: false, batchActiveResponderExecuteRTR: false, batchAdminExecuteRTR: true },
  ],
  [
    "runscript -CloudFile='collect'",
    { executeRTRCommand: false, batchActiveResponderExecuteRTR: true, batchAdminExecuteRTR: true },
  ],
];

const makeCtx = () => {
  const request = jest.fn();
  request.mockResolvedValueOnce({
    status: 201,
    headers: {},
    data: { batch_id: 'batch-1', resources: { [AID]: { session_id: 's1', errors: [] } } },
  });
  request.mockResolvedValue({ status: 201, headers: {}, data: { combined: { resources: {} } } });
  const ctx = {
    client: { request } as unknown as AxiosInstance,
    config: { region: 'us-2' },
    secrets: {},
    log: loggerMock.create(),
    getClient: jest.fn(),
  } as unknown as ActionContext;
  return { ctx, request };
};

const runCommand = async (name: ActionName, command: string) => {
  const { ctx, request } = makeCtx();
  const input = Crowdstrike2.actions[name].input.parse({ endpoint_ids: [AID], command });
  const error = await Crowdstrike2.actions[name].handler(ctx, input).then(
    () => undefined,
    (e: Error) => e
  );
  return { error, request };
};

beforeEach(() => {
  jest.spyOn(timing, 'sleep').mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('CrowdStrike Falcon Real Time Response tiers', () => {
  it('[C-rtr-tiers] each tier allows exactly its command list', () => {
    expect([...RTR_TIER_COMMANDS.read_only]).toEqual(READ_ONLY);
    expect([...RTR_TIER_COMMANDS.active_responder]).toEqual(ACTIVE_RESPONDER);
    expect([...RTR_TIER_COMMANDS.admin]).toEqual(ADMIN);
  });

  it('[C-rtr-tiers] does not add the commands the ruling left out', () => {
    for (const command of ['csrutil', 'ifconfig', 'users', 'tar', 'cswindiag', 'falconscript']) {
      expect(RTR_TIER_COMMANDS.admin).not.toContain(command);
    }
  });

  for (const [command, allowed] of TABLE) {
    for (const { name, tier, route } of ACTIONS) {
      if (allowed[name]) {
        it(`[C-rtr-tiers] ${name} accepts "${command}" and sends it to ${route}`, async () => {
          const { error, request } = await runCommand(name, command);
          expect(error).toBeUndefined();
          const [init, sent] = request.mock.calls.map(([c]) => c);
          expect(init.url).toBe(`${RTR}/combined/batch-init-session/v1`);
          expect(sent.url).toBe(`${RTR}/combined/${route}/v1`);
          expect(sent.data).toEqual({
            batch_id: 'batch-1',
            base_command: command.split(' ')[0],
            command_string: command,
          });
        });
      } else {
        it(`[C-rtr-tiers] ${name} refuses "${command}" before opening a session, naming the ${tier} tier`, async () => {
          const { error, request } = await runCommand(name, command);
          const base = command.split(' ')[0];
          expect(error?.message).toContain(
            `'${base}' is not allowed in the ${tier} Real Time Response tier. Allowed commands: cat, cd,`
          );
          expect(request).not.toHaveBeenCalled();
        });
      }
    }
  }

  it('[C-rtr-tiers] names every allowed command of the tier in a refusal', async () => {
    const { error } = await runCommand('batchActiveResponderExecuteRTR', 'put tool.exe');
    expect(error?.message).toContain(`Allowed commands: ${ACTIVE_RESPONDER.join(', ')}.`);
  });

  it('[C-rtr-tiers] describes each tier list in the command input', () => {
    const commandText = (name: ActionName) =>
      String(
        (
          Crowdstrike2.actions[name].input as unknown as {
            shape: { command: { description?: string } };
          }
        ).shape.command.description
      );
    expect(commandText('batchActiveResponderExecuteRTR')).toContain('umount');
    expect(commandText('batchAdminExecuteRTR')).toContain('put, put-and-run and run');
    expect(commandText('executeRTRCommand')).not.toContain('umount');
  });
});
