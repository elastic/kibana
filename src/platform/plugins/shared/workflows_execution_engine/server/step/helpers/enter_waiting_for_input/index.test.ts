/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { enterWaitingForInput, WAITING_FOR_INPUT_STATE_KIND } from '.';

describe('enterWaitingForInput', () => {
  describe('stepState', () => {
    it('includes the kind sentinel', () => {
      const { stepState } = enterWaitingForInput({});

      expect(stepState.kind).toBe(WAITING_FOR_INPUT_STATE_KIND);
    });

    it('spreads stepState fields alongside the kind sentinel', () => {
      const { stepState } = enterWaitingForInput({
        stepState: { conversationId: 'conv-1', innerExecutionId: 'exec-42' },
      });

      expect(stepState).toEqual({
        kind: WAITING_FOR_INPUT_STATE_KIND,
        conversationId: 'conv-1',
        innerExecutionId: 'exec-42',
      });
    });

    it('produces only the kind when stepState is undefined', () => {
      const { stepState } = enterWaitingForInput({});

      expect(stepState).toEqual({ kind: WAITING_FOR_INPUT_STATE_KIND });
    });
  });

  describe('stepInput', () => {
    it('includes agent_context when provided', () => {
      const agentContext = {
        intended_tool: 'myTool',
        intended_tool_args: { arg: 1 },
        reasoning: 'because',
      };

      const { stepInput } = enterWaitingForInput({ agent_context: agentContext });

      expect(stepInput.agent_context).toEqual(agentContext);
    });

    it('omits agent_context when undefined', () => {
      const { stepInput } = enterWaitingForInput({ message: 'prompt' });

      expect(stepInput).not.toHaveProperty('agent_context');
    });

    it('includes message when provided', () => {
      const { stepInput } = enterWaitingForInput({ message: 'What is your name?' });

      expect(stepInput.message).toBe('What is your name?');
    });

    it('omits message when undefined', () => {
      const { stepInput } = enterWaitingForInput({});

      expect(stepInput).not.toHaveProperty('message');
    });

    it('includes schema when provided', () => {
      const schema = { type: 'object', properties: { name: { type: 'string' } } };

      const { stepInput } = enterWaitingForInput({ schema });

      expect(stepInput.schema).toEqual(schema);
    });

    it('omits schema when undefined', () => {
      const { stepInput } = enterWaitingForInput({});

      expect(stepInput).not.toHaveProperty('schema');
    });

    it('includes all optional fields when all are provided', () => {
      const agentContext = {
        intended_tool: 'tool',
        intended_tool_args: {},
        reasoning: 'r',
      };
      const schema = { type: 'object' };

      const { stepInput } = enterWaitingForInput({
        agent_context: agentContext,
        message: 'msg',
        schema,
      });

      expect(stepInput).toEqual({ agent_context: agentContext, message: 'msg', schema });
    });

    it('returns empty stepInput when no optional fields are provided', () => {
      const { stepInput } = enterWaitingForInput({});

      expect(stepInput).toEqual({});
    });
  });
});
