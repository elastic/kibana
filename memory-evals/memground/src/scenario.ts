import type { ImportRound } from '@memory-evals/shared';

export {
  planMemGroundScenario as planScenario,
  type PlannedProbe,
  type PlannedSession,
  type ScenarioPlan,
} from '@memory-evals/shared';

const EMPTY_USER_PLACEHOLDER = '(prior context)';
const EMPTY_ASSISTANT_PLACEHOLDER = '(no reply recorded)';

/** Replace empty user / assistant message strings so the import API accepts them. */
export const padRounds = (rounds: ImportRound[]): ImportRound[] =>
  rounds.map((r) => ({
    ...r,
    user_message: r.user_message.trim().length === 0 ? EMPTY_USER_PLACEHOLDER : r.user_message,
    assistant_message:
      r.assistant_message.trim().length === 0 ? EMPTY_ASSISTANT_PLACEHOLDER : r.assistant_message,
  }));
