import { createHash } from 'node:crypto';

import {
  type ImportRound,
  type KibanaClient,
  log,
  mem2ActDialogueToRounds,
  type Mem2ActSample,
} from '@memory-evals/shared';

const EMPTY_USER_PLACEHOLDER = '(prior context)';
const EMPTY_ASSISTANT_PLACEHOLDER = '(no reply recorded)';

const padRounds = (rounds: ImportRound[]): ImportRound[] =>
  rounds.map((r) => ({
    ...r,
    user_message: r.user_message.trim().length === 0 ? EMPTY_USER_PLACEHOLDER : r.user_message,
    assistant_message:
      r.assistant_message.trim().length === 0 ? EMPTY_ASSISTANT_PLACEHOLDER : r.assistant_message,
  }));

const deterministicId = (runId: string, sampleId: string): string => {
  const h = createHash('sha256').update(`${runId}\x00${sampleId}\x00dialogue`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

export interface IngestOptions {
  client: KibanaClient;
  agentId: string;
  runId: string;
  skipMemoryExtract?: boolean;
}

export interface IngestedSample {
  sample_id: string;
  conversation_id: string;
  rounds: number;
}

export const ingestSample = async (
  sample: Mem2ActSample,
  opts: IngestOptions
): Promise<IngestedSample | null> => {
  const { client, agentId, runId } = opts;
  const baseRounds = mem2ActDialogueToRounds(sample.dialogue);
  if (baseRounds.length === 0) {
    log(`  skip sample ${sample.sample_id} — empty dialogue`);
    return null;
  }
  const rounds = padRounds(baseRounds);
  const conversationId = deterministicId(runId, sample.sample_id);
  const title = `eval:${runId}:mem2act:${sample.sample_id}`.slice(0, 256);

  try {
    await client.importConversation({
      agent_id: agentId,
      id: conversationId,
      title,
      mode: 'overwrite',
      rounds,
    });
  } catch (e) {
    throw new Error(
      `Mem2Act ingest failed (sample=${sample.sample_id}): ${(e as Error).message}`
    );
  }

  if (!opts.skipMemoryExtract) {
    try {
      await client.triggerMemoryExtract({ conversation_id: conversationId, agent_id: agentId });
    } catch (e) {
      throw new Error(
        `Mem2Act memory extract failed (sample=${sample.sample_id}): ${(e as Error).message}`
      );
    }
  }

  return { sample_id: sample.sample_id, conversation_id: conversationId, rounds: rounds.length };
};
