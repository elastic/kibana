/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerWorkflowYamlDiffAttachment } from './workflow_yaml_diff_attachment';
import { WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE } from '../../../common/agent_builder/constants';
import type { AgentBuilderPluginSetupContract } from '../../types';

interface RegisteredDiffType {
  id: string;
  validate: (input: unknown) => { valid: true; data: unknown } | { valid: false; error: string };
  format: (attachment: {
    data: {
      beforeYaml: string;
      afterYaml: string;
      proposalId: string;
      status: string;
    };
  }) => { getRepresentation: () => { type: 'text'; value: string } };
  getAgentDescription: () => string;
}

const registerAndCapture = () => {
  let registeredType: RegisteredDiffType | undefined;
  const mockAgentBuilder = {
    attachments: {
      registerType: jest.fn((type: unknown) => {
        registeredType = type as RegisteredDiffType;
      }),
    },
  } as unknown as AgentBuilderPluginSetupContract;

  registerWorkflowYamlDiffAttachment(mockAgentBuilder);
  return registeredType!;
};

describe('workflow_yaml_diff_attachment', () => {
  describe('validate', () => {
    it('accepts valid diff data and defaults status to pending', () => {
      const type = registerAndCapture();
      const result = type.validate({
        beforeYaml: 'version: "1"',
        afterYaml: 'version: "1"\nname: Test',
        proposalId: 'p-1',
      });

      expect(result).toEqual({
        valid: true,
        data: {
          beforeYaml: 'version: "1"',
          afterYaml: 'version: "1"\nname: Test',
          proposalId: 'p-1',
          status: 'pending',
        },
      });
    });

    it('rejects input missing required fields', () => {
      const type = registerAndCapture();
      expect(type.validate({ beforeYaml: 'x' })).toMatchObject({ valid: false });
    });
  });

  describe('format', () => {
    it('produces a unified diff with proposal metadata', () => {
      const type = registerAndCapture();
      const { value } = type
        .format({
          data: {
            beforeYaml: 'version: "1"\nname: Old',
            afterYaml: 'version: "1"\nname: New',
            proposalId: 'p-42',
            status: 'pending',
          },
        })
        .getRepresentation();

      expect(value).toContain('Proposal ID: p-42');
      expect(value).toContain('Status: PENDING');
      expect(value).toContain('```diff');
      expect(value).toContain('-name: Old');
      expect(value).toContain('+name: New');
      expect(value).toContain(' version: "1"');
    });
  });

  describe('getAgentDescription', () => {
    it('references the diff attachment type', () => {
      const type = registerAndCapture();
      expect(type.getAgentDescription()).toContain(WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE);
    });
  });
});
