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
import { shapeBatchResults } from './format';

const AID = '0123456789abcdef0123456789abcdef';

// Not offered to agents: actions that run code or change the RTR library or quarantined files, that weaken
// protection (an allow-listing IOC, custom IOA rules), that undo a response (lifting containment), change
// host group policy assignment or delete detections, or kill a process; and rtrRetrieveFile, whose result is
// the whole file archive as base64 (up to about 1.4 MB), too large for a model context and of no use to it.
// Offered: containHost (protective, reversible by an analyst, the host keeps its Falcon cloud link),
// updateAlert and updateCase (triage metadata, reversible, comments are additive), createScan (protective,
// quarantine is opt-in and reversible) and stopNgSiemSearch (only cancels a search job).
const NOT_FOR_AGENTS = [
  'rtrRetrieveFile',
  'uploadRTRFile',
  'deleteRTRFile',
  'uploadRTRScript',
  'deleteRTRScript',
  'applyQuarantineFileAction',
  'batchActiveResponderExecuteRTR',
  'batchAdminExecuteRTR',
  'liftContainment',
  'addHostGroupMembers',
  'removeHostGroupMembers',
  'uploadIOC',
  'deleteIOC',
  'rtrKillProcess',
  'createIOARule',
  'updateIOARule',
  'deleteIOARule',
];

const ctxWith = (replies: Array<{ status: number; data: unknown }>) => {
  const request = jest.fn();
  for (const reply of replies) {
    request.mockResolvedValueOnce({ headers: {}, ...reply });
  }
  const ctx = {
    client: { request } as unknown as AxiosInstance,
    config: { region: 'us-1' },
    secrets: {},
    log: loggerMock.create(),
    getClient: jest.fn(),
  } as unknown as ActionContext;
  return { ctx, request };
};

describe('CrowdStrike Falcon agent exposure and read retries', () => {
  beforeEach(() => {
    jest.spyOn(timing, 'sleep').mockResolvedValue(undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('offers exactly the read and investigation actions to agents', () => {
    const notTools = Object.entries(Crowdstrike2.actions)
      .filter(([, definition]) => !definition.isTool)
      .map(([name]) => name)
      .sort();
    expect(notTools).toEqual([...NOT_FOR_AGENTS].sort());
    for (const name of [
      'updateAlert',
      'getRTRCommandStatus',
      'spotlightSearchVulnerability',
      'containHost',
      'updateCase',
      'createScan',
      'stopNgSiemSearch',
    ]) {
      expect(Crowdstrike2.actions[name].isTool).toBe(true);
    }
  });

  it('tells agents to confirm sandbox submissions with the user', () => {
    expect(Crowdstrike2.skill).toContain(
      'Confirm with the user before detonateUrl or detonateFile'
    );
  });

  it('tells agents that a detonation is called again with submission_id while it is not complete', () => {
    expect(Crowdstrike2.skill).toContain('when `complete` is false');
  });

  it('reports a host that only appears in the batch init reply with its errors as not complete', () => {
    const results = shapeBatchResults(
      { [AID]: { session_id: 's1', errors: [{ code: 50007, message: 'could not get session' }] } },
      {}
    );
    expect(results).toEqual([
      expect.objectContaining({ host_id: AID, complete: false, offline_queued: false }),
    ]);
  });

  it('marks a host that was queued while offline as offline_queued, without a command result', () => {
    const results = shapeBatchResults(
      { [AID]: { session_id: 's1', offline_queued: true, errors: [] } },
      {}
    );
    expect(results).toEqual([
      expect.objectContaining({ host_id: AID, complete: false, offline_queued: true, errors: [] }),
    ]);
  });

  it('retries a 500 on getAgentOnlineStatus and on spotlightSearchVulnerability', async () => {
    const online = ctxWith([
      { status: 500, data: { errors: [{ message: 'internal error' }] } },
      { status: 200, data: { resources: [{ id: AID, state: 'online' }] } },
    ]);
    const input = Crowdstrike2.actions.getAgentOnlineStatus.input.parse({ ids: [AID] });
    await expect(
      Crowdstrike2.actions.getAgentOnlineStatus.handler(online.ctx, input)
    ).resolves.toMatchObject({ resources: [{ id: AID, state: 'online' }] });
    expect(online.request).toHaveBeenCalledTimes(2);

    const spot = ctxWith([
      { status: 500, data: { errors: [{ message: 'internal error' }] } },
      { status: 200, data: { resources: [{ id: 'v1' }], meta: { pagination: { after: null } } } },
    ]);
    const spotInput = Crowdstrike2.actions.spotlightSearchVulnerability.input.parse({
      filter: "status:'open'",
    });
    await expect(
      Crowdstrike2.actions.spotlightSearchVulnerability.handler(spot.ctx, spotInput)
    ).resolves.toMatchObject({ resources: [{ id: 'v1' }] });
    expect(spot.request).toHaveBeenCalledTimes(2);
  });
});
