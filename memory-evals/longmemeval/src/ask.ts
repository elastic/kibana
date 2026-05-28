import type { ConverseResponse, KibanaClient } from '@memory-evals/shared';

export interface AskOptions {
  client: KibanaClient;
  agentId: string;
  question: string;
  connectorId?: string;
}

export interface AskResult {
  predicted_answer: string;
  raw: ConverseResponse;
}

export const askQuestion = async (opts: AskOptions): Promise<AskResult> => {
  const request: Parameters<KibanaClient['converse']>[0] = {
    agent_id: opts.agentId,
    input: opts.question,
    persist: false,
  };
  if (opts.connectorId) request.connector_id = opts.connectorId;
  const raw = await opts.client.converse(request);
  const predicted = extractAnswer(raw);
  return { predicted_answer: predicted, raw };
};

const extractAnswer = (raw: ConverseResponse): string => {
  const direct = raw.response?.message;
  if (typeof direct === 'string' && direct.length > 0) return direct;
  // Fall back to scanning steps[] for the final assistant response chunk.
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
