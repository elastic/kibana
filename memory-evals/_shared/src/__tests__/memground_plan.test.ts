import { describe, expect, it } from 'vitest';

import { planMemGroundScenario } from '../memground_plan.js';
import type { MemGroundScenario } from '../types.js';

const scenario = (events: MemGroundScenario['events']): MemGroundScenario => ({
  scenario_id: 's',
  events,
});

describe('planMemGroundScenario', () => {
  it('pairs user/assistant turns into a single session with all probes', () => {
    const plan = planMemGroundScenario(
      scenario([
        { type: 'user_message', content: 'I like tea' },
        { type: 'assistant_message', content: 'Got it' },
        { type: 'probe', question: 'What do I like?', answer: 'tea' },
      ])
    );
    expect(plan.sessions).toHaveLength(1);
    expect(plan.sessions[0]?.rounds).toEqual([
      { user_message: 'I like tea', assistant_message: 'Got it' },
    ]);
    expect(plan.sessions[0]?.probes[0]?.rounds_before).toBe(1);
    expect(plan.total_probes).toBe(1);
  });

  it('splits into two sessions on session_break and preserves the title', () => {
    const plan = planMemGroundScenario(
      scenario([
        { type: 'user_message', content: 'a' },
        { type: 'assistant_message', content: 'b' },
        { type: 'session_break', next_session_title: 'Next day' },
        { type: 'user_message', content: 'c' },
        { type: 'assistant_message', content: 'd' },
        { type: 'probe', question: 'q', answer: 'a' },
      ])
    );
    expect(plan.sessions).toHaveLength(2);
    expect(plan.sessions[0]?.rounds).toHaveLength(1);
    expect(plan.sessions[1]?.title).toBe('Next day');
    expect(plan.sessions[1]?.probes[0]?.rounds_before).toBe(1);
  });

  it('attaches probes to the correct session in order', () => {
    const plan = planMemGroundScenario(
      scenario([
        { type: 'user_message', content: 'A' },
        { type: 'assistant_message', content: 'B' },
        { type: 'probe', question: 'q1', answer: 'a' },
        { type: 'session_break' },
        { type: 'user_message', content: 'C' },
        { type: 'assistant_message', content: 'D' },
        { type: 'probe', question: 'q2', answer: 'a' },
        { type: 'probe', question: 'q3', answer: 'a' },
      ])
    );
    expect(plan.sessions).toHaveLength(2);
    expect(plan.sessions[0]?.probes.map((p) => p.probe.question)).toEqual(['q1']);
    expect(plan.sessions[1]?.probes.map((p) => p.probe.question)).toEqual(['q2', 'q3']);
  });

  it('inserts synthetic assistant reply for two consecutive user messages', () => {
    const plan = planMemGroundScenario(
      scenario([
        { type: 'user_message', content: 'first' },
        { type: 'user_message', content: 'second' },
        { type: 'assistant_message', content: 'response' },
        { type: 'probe', question: 'q', answer: 'a' },
      ])
    );
    const rounds = plan.sessions[0]?.rounds ?? [];
    expect(rounds).toHaveLength(2);
    expect(rounds[0]?.user_message).toBe('first');
    expect(rounds[0]?.assistant_message).toMatch(/no assistant reply/);
    expect(rounds[1]?.assistant_message).toBe('response');
  });

  it('inserts synthetic user prompt for orphan assistant message', () => {
    const plan = planMemGroundScenario(
      scenario([
        { type: 'assistant_message', content: 'opener' },
        { type: 'probe', question: 'q', answer: 'a' },
      ])
    );
    expect(plan.sessions[0]?.rounds[0]?.user_message).toMatch(/no prior user turn/);
    expect(plan.sessions[0]?.rounds[0]?.assistant_message).toBe('opener');
  });

  it('prunes empty trailing session_break', () => {
    const plan = planMemGroundScenario(
      scenario([
        { type: 'user_message', content: 'x' },
        { type: 'assistant_message', content: 'y' },
        { type: 'probe', question: 'q', answer: 'a' },
        { type: 'session_break' },
      ])
    );
    expect(plan.sessions).toHaveLength(1);
  });

  it('re-indexes session_idx after pruning leading empty sessions', () => {
    const plan = planMemGroundScenario(
      scenario([
        { type: 'session_break' },
        { type: 'user_message', content: 'a' },
        { type: 'assistant_message', content: 'b' },
        { type: 'probe', question: 'q', answer: 'a' },
      ])
    );
    expect(plan.sessions).toHaveLength(1);
    expect(plan.sessions[0]?.session_idx).toBe(0);
  });

  it('flushes pending user before a probe so the probe sees that round', () => {
    const plan = planMemGroundScenario(
      scenario([
        { type: 'user_message', content: 'unanswered' },
        { type: 'probe', question: 'q', answer: 'a' },
      ])
    );
    expect(plan.sessions[0]?.rounds).toHaveLength(1);
    expect(plan.sessions[0]?.rounds[0]?.user_message).toBe('unanswered');
    expect(plan.sessions[0]?.probes[0]?.rounds_before).toBe(1);
  });
});
