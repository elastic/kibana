/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers } from './classic.stateful.config';

describe('alertzero_e2e config set', () => {
  const args = servers.kbnTestServer.serverArgs;

  it('enables alertzero and the plugins it requires', () => {
    expect(args).toEqual(
      expect.arrayContaining([
        '--xpack.alertzero.enabled=true',
        '--xpack.agenticInvestigations.enabled=true',
        '--xpack.proposals.enabled=true',
      ])
    );
  });

  it('enables service accounts so alertzero installs its managed workflows', () => {
    expect(args).toContain('--xpack.security.serviceAccounts.enabled=true');
  });

  it('keeps the EIS preconfigured connectors from the agent_builder_smoke base', () => {
    expect(args.some((arg) => arg.startsWith('--xpack.actions.preconfigured='))).toBe(true);
  });

  it('turns the AlertZero advanced setting on, or every AlertZero route answers 404', () => {
    expect(args).toContain('--uiSettings.overrides.securitySolution:enableAlertZero=true');
  });

  it('enables endpointForensicAnalysisSkill, or the forensics Worker is never listed and no Isolate proposal can exist', () => {
    expect(args).toContain(
      '--xpack.securitySolution.enableExperimental=["endpointForensicAnalysisSkill"]'
    );
  });

  it('passes enableExperimental exactly once', () => {
    expect(args.filter((arg) => arg.includes('securitySolution.enableExperimental'))).toHaveLength(
      1
    );
  });

  describe('default AI connector', () => {
    const ENV = 'ALERTZERO_E2E_AI_CONNECTOR';
    const original = process.env[ENV];

    const loadArgs = (): string[] => {
      let loaded: string[] = [];
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        loaded = require('./classic.stateful.config').servers.kbnTestServer.serverArgs;
      });
      return loaded;
    };

    afterEach(() => {
      if (original === undefined) {
        delete process.env[ENV];
      } else {
        process.env[ENV] = original;
      }
    });

    it('is left to the stack default when ALERTZERO_E2E_AI_CONNECTOR is unset', () => {
      delete process.env[ENV];
      expect(loadArgs().some((arg) => arg.includes('genAiSettings:defaultAIConnector'))).toBe(
        false
      );
    });

    it('is pinned from ALERTZERO_E2E_AI_CONNECTOR', () => {
      process.env[ENV] = ' eis-gpt-5-6-sol ';
      expect(loadArgs()).toContain(
        '--uiSettings.overrides.genAiSettings:defaultAIConnector=eis-gpt-5-6-sol'
      );
    });
  });
});
