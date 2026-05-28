import type {
  ImportRound,
  MemGroundEvent,
  MemGroundProbeEvent,
  MemGroundScenario,
} from './types.js';

/**
 * A pre-computed "session" is one conversation. It contains all paired turns
 * that should be persisted for that session and the probes that need to be
 * asked after the turns are persisted/extracted.
 *
 * The state machine walks the scenario events in order:
 *  - user_message → buffer as pending user turn
 *  - assistant_message → if a user turn is pending, pair them into a round;
 *      otherwise drop a synthetic user turn so the assistant message is
 *      preserved (rare; canonical MemGround scenarios always pair turns).
 *  - probe → attach to the current session at its current position
 *  - session_break → close the current session, open a new one
 *
 * Empty trailing sessions (no rounds and no probes) are pruned.
 */
export interface PlannedProbe {
  event_idx: number;
  /** How many rounds had been emitted into this session at the time the probe fired. */
  rounds_before: number;
  probe: MemGroundProbeEvent;
}

export interface PlannedSession {
  session_idx: number;
  /** Optional title carried over from a session_break event. */
  title?: string;
  rounds: ImportRound[];
  /** Probes in this session, in the order they should be asked. */
  probes: PlannedProbe[];
}

export interface ScenarioPlan {
  scenario: MemGroundScenario;
  sessions: PlannedSession[];
  total_probes: number;
}

const SYNTHETIC_USER_PROMPT = '(no prior user turn)';
const SYNTHETIC_ASSISTANT_REPLY = '(no assistant reply recorded)';

export const planMemGroundScenario = (scenario: MemGroundScenario): ScenarioPlan => {
  const sessions: PlannedSession[] = [];
  let current: PlannedSession = { session_idx: 0, rounds: [], probes: [] };
  let pendingUser: string | undefined;
  let totalProbes = 0;

  const flushPendingUser = (): void => {
    if (pendingUser !== undefined) {
      current.rounds.push({
        user_message: pendingUser,
        assistant_message: SYNTHETIC_ASSISTANT_REPLY,
      });
      pendingUser = undefined;
    }
  };

  for (let i = 0; i < scenario.events.length; i++) {
    const event = scenario.events[i] as MemGroundEvent;
    switch (event.type) {
      case 'user_message':
        flushPendingUser();
        pendingUser = event.content;
        break;
      case 'assistant_message':
        if (pendingUser !== undefined) {
          current.rounds.push({
            user_message: pendingUser,
            assistant_message: event.content,
          });
          pendingUser = undefined;
        } else {
          current.rounds.push({
            user_message: SYNTHETIC_USER_PROMPT,
            assistant_message: event.content,
          });
        }
        break;
      case 'probe':
        flushPendingUser();
        current.probes.push({
          event_idx: i,
          rounds_before: current.rounds.length,
          probe: event,
        });
        totalProbes += 1;
        break;
      case 'session_break':
        flushPendingUser();
        if (current.rounds.length > 0 || current.probes.length > 0) {
          sessions.push(current);
        }
        current = {
          session_idx: sessions.length,
          rounds: [],
          probes: [],
          ...(event.next_session_title ? { title: event.next_session_title } : {}),
        };
        break;
    }
  }
  flushPendingUser();
  if (current.rounds.length > 0 || current.probes.length > 0) {
    sessions.push(current);
  }
  for (let s = 0; s < sessions.length; s++) sessions[s]!.session_idx = s;
  return { scenario, sessions, total_probes: totalProbes };
};
