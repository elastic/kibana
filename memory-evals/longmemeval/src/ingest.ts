import { createHash } from 'node:crypto';

import {
  type ImportRound,
  type KibanaClient,
  type LongMemEvalItem,
  log,
  parseLongMemEvalDate,
  lmeSessionToRounds,
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

const deterministicId = (runId: string, questionId: string, sessionIdx: number): string => {
  const h = createHash('sha256')
    .update(`${runId}\x00${questionId}\x00${sessionIdx}`)
    .digest('hex');
  // shape it as a UUID-ish lowercase string so it's friendly to log filters.
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

export interface IngestOptions {
  client: KibanaClient;
  agentId: string;
  runId: string;
  /** Skip memory extract calls — useful for record-only smoke runs. */
  skipMemoryExtract?: boolean;
  /** Limit how many haystack sessions per question are imported (debug). */
  maxSessions?: number;
}

export interface IngestedConversation {
  conversation_id: string;
  session_idx: number;
  session_id: string;
  rounds: number;
  started_at?: string;
}

/**
 * Imports each haystack session of a LongMemEval question as its own Agent
 * Builder conversation and triggers memory extraction for each.
 */
export const ingestQuestion = async (
  item: LongMemEvalItem,
  opts: IngestOptions
): Promise<IngestedConversation[]> => {
  const { client, agentId, runId } = opts;
  const sessions = opts.maxSessions
    ? item.haystack_sessions.slice(0, opts.maxSessions)
    : item.haystack_sessions;

  const out: IngestedConversation[] = [];
  for (let idx = 0; idx < sessions.length; idx++) {
    const turns = sessions[idx];
    if (!turns || turns.length === 0) continue;
    const dateRaw = item.haystack_dates[idx];
    const dateIso = parseLongMemEvalDate(dateRaw);
    const sessionId = item.haystack_session_ids[idx] ?? `s${idx}`;
    const sessionTimestampOpts: { sessionDateIso?: string; questionId: string; sessionIdx: number } = {
      questionId: item.question_id,
      sessionIdx: idx,
    };
    if (dateIso !== undefined) sessionTimestampOpts.sessionDateIso = dateIso;
    const rounds = padRounds(lmeSessionToRounds(turns, sessionTimestampOpts));
    if (rounds.length === 0) continue;

    const conversationId = deterministicId(runId, item.question_id, idx);
    const title = `eval:${runId}:${item.question_id}:${sessionId}`;

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
        `LongMemEval ingest failed (question_id=${item.question_id}, session=${sessionId}): ${(e as Error).message}`
      );
    }

    if (!opts.skipMemoryExtract) {
      const memoryOpts: { conversation_id: string; agent_id: string; started_at?: string } = {
        conversation_id: conversationId,
        agent_id: agentId,
      };
      if (dateIso !== undefined) memoryOpts.started_at = dateIso;
      try {
        await client.triggerMemoryExtract(memoryOpts);
      } catch (e) {
        throw new Error(
          `LongMemEval memory extract failed (question_id=${item.question_id}, session=${sessionId}): ${(e as Error).message}`
        );
      }
    }

    const ingested: IngestedConversation = {
      conversation_id: conversationId,
      session_idx: idx,
      session_id: sessionId,
      rounds: rounds.length,
    };
    if (dateIso !== undefined) ingested.started_at = dateIso;
    out.push(ingested);
  }
  log(`  ingested ${out.length} session(s) for ${item.question_id}`);
  return out;
};

