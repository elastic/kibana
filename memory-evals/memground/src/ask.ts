import type { ConverseResponse, KibanaClient } from '@memory-evals/shared';

export interface AskOptions {
  client: KibanaClient;
  agentId: string;
  question: string;
  /** Optional — attaches the probe to a specific conversation for history+memory grounding. */
  conversationId?: string;
  connectorId?: string;
  /** When true, the probe round is NOT persisted on the conversation. */
  persistFalse?: boolean;
}

export interface AskResult {
  predicted_answer: string;
  raw: ConverseResponse;
}

export const askProbe = async (opts: AskOptions): Promise<AskResult> => {
  const request: Parameters<KibanaClient['converse']>[0] = {
    agent_id: opts.agentId,
    input: opts.question,
  };
  if (opts.conversationId) request.conversation_id = opts.conversationId;
  if (opts.connectorId) request.connector_id = opts.connectorId;
  if (opts.persistFalse) request.persist = false;
  const raw = await opts.client.converse(request);
  return { predicted_answer: extractAnswer(raw), raw };
};

const extractAnswer = (raw: ConverseResponse): string => {
  const direct = raw.response?.message;
  if (typeof direct === 'string' && direct.length > 0) return direct;
  if (Array.isArray(raw.steps)) {
    for (let i = raw.steps.length - 1; i >= 0; i--) {
      const s = raw.steps[i] as Record<string, unknown> | undefined;
      if (!s) continue;
      const message = s.message ?? (s.response as Record<string, unknown> | undefined)?.message;
      if (typeof message === 'string' && message.length > 0) return message;
    }
  }
  return '';
};
