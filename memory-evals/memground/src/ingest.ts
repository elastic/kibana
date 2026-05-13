import { createHash } from 'node:crypto';

import { type ImportRound, type KibanaClient } from '@memory-evals/shared';

import { padRounds, type PlannedSession } from './scenario.js';

const deterministicSessionId = (runId: string, scenarioId: string, sessionIdx: number): string => {
  const h = createHash('sha256')
    .update(`${runId}\x00${scenarioId}\x00session_${sessionIdx}`)
    .digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

export interface IngestSessionOptions {
  client: KibanaClient;
  agentId: string;
  runId: string;
  scenarioId: string;
  session: PlannedSession;
  /** When set, only this many rounds (from the start of the session) are imported. */
  roundsLimit?: number;
  skipMemoryExtract?: boolean;
}

export interface IngestSessionResult {
  conversation_id: string;
  session_idx: number;
  rounds_imported: number;
}

/**
 * Imports a session's rounds (optionally truncated to `roundsLimit`) and
 * triggers memory extract. Idempotent — uses `mode: 'overwrite'` so the same
 * conversation_id can be re-imported with a longer prefix as probes advance.
 *
 * Note: the runner currently imports the FULL session before asking any of
 * its probes (rather than re-importing prefixes per probe) for simplicity
 * and to avoid duplicate memory extractions. `roundsLimit` is exposed for
 * future strict-causality mode.
 */
export const ingestSession = async (
  opts: IngestSessionOptions
): Promise<IngestSessionResult | null> => {
  const { client, session, runId, scenarioId, agentId } = opts;
  const allRounds: ImportRound[] = session.rounds;
  const limit = opts.roundsLimit ?? allRounds.length;
  const slice = allRounds.slice(0, limit);
  const conversationId = deterministicSessionId(runId, scenarioId, session.session_idx);

  if (slice.length === 0) {
    // Empty session — still create a placeholder conversation so probes have a
    // conversation_id to attach to.
    const placeholder: ImportRound[] = [
      { user_message: '(scenario opener)', assistant_message: '(no turns recorded yet)' },
    ];
    await client.importConversation({
      agent_id: agentId,
      id: conversationId,
      title: `eval:${runId}:${scenarioId}:s${session.session_idx}:empty`.slice(0, 256),
      mode: 'overwrite',
      rounds: placeholder,
    });
    if (!opts.skipMemoryExtract) {
      try {
        await client.triggerMemoryExtract({ conversation_id: conversationId, agent_id: agentId });
      } catch {
        // best-effort — extraction may fail on the placeholder turn.
      }
    }
    return { conversation_id: conversationId, session_idx: session.session_idx, rounds_imported: 0 };
  }

  const padded = padRounds(slice);
  const titleSuffix = session.title ? `:${session.title}` : '';
  const title = `eval:${runId}:${scenarioId}:s${session.session_idx}${titleSuffix}`.slice(0, 256);

  await client.importConversation({
    agent_id: agentId,
    id: conversationId,
    title,
    mode: 'overwrite',
    rounds: padded,
  });

  if (!opts.skipMemoryExtract) {
    await client.triggerMemoryExtract({ conversation_id: conversationId, agent_id: agentId });
  }

  return {
    conversation_id: conversationId,
    session_idx: session.session_idx,
    rounds_imported: padded.length,
  };
};
