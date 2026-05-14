/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Sentinel value stored in step state to identify the WAITING_FOR_INPUT pause. */
export const WAITING_FOR_INPUT_STATE_KIND = 'waiting_for_input' as const;

interface AgentContext {
  intended_tool: string;
  intended_tool_args: Record<string, unknown>;
  reasoning: string;
}

interface WaitingForInputParams {
  agent_context?: AgentContext;
  message?: string;
  schema?: Record<string, unknown>;
  stepState?: Record<string, unknown>;
}

interface EnterWaitingForInputResult {
  /** Payload for setCurrentStepState — persisted across the pause/resume cycle. */
  stepState: Record<string, unknown>;
  /** Payload for the second setInput call — makes the execution record self-contained. */
  stepInput: Record<string, unknown>;
}

/**
 * Pure: builds the setCurrentStepState and setInput payloads from the
 * waitingForInput result returned by a step handler.
 *
 * Side-effects (the actual runtime calls) remain in CustomStepImpl.
 */
export const enterWaitingForInput = (
  waitingForInput: WaitingForInputParams
): EnterWaitingForInputResult => {
  const { agent_context: agentContext, message, schema, stepState } = waitingForInput;

  return {
    stepInput: {
      ...(agentContext !== undefined && { agent_context: agentContext }),
      ...(message !== undefined && { message }),
      ...(schema !== undefined && { schema }),
    },
    stepState: {
      kind: WAITING_FOR_INPUT_STATE_KIND,
      ...(stepState ?? {}),
    },
  };
};
