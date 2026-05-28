import { createHash } from 'node:crypto';

import {
  chunkRoundsIntoSessions,
  type ImportRound,
  type KibanaClient,
  log,
  mabDocumentsToRounds,
  mabTurnsToRounds,
  type MemoryAgentBenchSample,
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

const deterministicId = (runId: string, sampleId: string, sessionIdx: number): string => {
  const h = createHash('sha256')
    .update(`${runId}\x00${sampleId}\x00session_${sessionIdx}`)
    .digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

export interface IngestOptions {
  client: KibanaClient;
  agentId: string;
  runId: string;
  /** Skip memory extract calls. */
  skipMemoryExtract?: boolean;
  /** Max rounds per imported conversation. 0 = one conversation per sample. */
  sessionSize?: number;
  /** Limit how many sessions are imported per sample (debug). */
  maxSessions?: number;
}

export interface IngestedSession {
  conversation_id: string;
  session_idx: number;
  rounds: number;
}

export const ingestSample = async (
  sample: MemoryAgentBenchSample,
  opts: IngestOptions
): Promise<IngestedSession[]> => {
  const { client, agentId, runId } = opts;
  const baseRounds = sample.context_turns
    ? mabTurnsToRounds(sample.context_turns)
    : sample.context_documents
    ? mabDocumentsToRounds(sample.context_documents)
    : [];
  if (baseRounds.length === 0) {
    log(`  skip sample ${sample.sample_id} — no context turns or documents`);
    return [];
  }
  const chunkSize = opts.sessionSize ?? 0;
  const sessions = chunkRoundsIntoSessions(baseRounds, chunkSize);
  const slice = opts.maxSessions ? sessions.slice(0, opts.maxSessions) : sessions;
  const out: IngestedSession[] = [];

  for (let idx = 0; idx < slice.length; idx++) {
    const rawRounds = slice[idx];
    if (!rawRounds || rawRounds.length === 0) continue;
    const rounds = padRounds(rawRounds);
    const conversationId = deterministicId(runId, sample.sample_id, idx);
    const titleBase = sample.title ?? sample.sample_id;
    const title = `eval:${runId}:${sample.sample_id}:${idx}:${titleBase}`.slice(0, 256);

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
        `MemoryAgentBench ingest failed (sample=${sample.sample_id}, session=${idx}): ${(e as Error).message}`
      );
    }

    if (!opts.skipMemoryExtract) {
      try {
        await client.triggerMemoryExtract({ conversation_id: conversationId, agent_id: agentId });
      } catch (e) {
        throw new Error(
          `MemoryAgentBench memory extract failed (sample=${sample.sample_id}, session=${idx}): ${(e as Error).message}`
        );
      }
    }

    out.push({ conversation_id: conversationId, session_idx: idx, rounds: rounds.length });
  }
  log(`  ingested ${out.length} session(s) for sample ${sample.sample_id}`);
  return out;
};
