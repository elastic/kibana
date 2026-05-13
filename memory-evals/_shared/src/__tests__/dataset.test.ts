import { describe, expect, it } from 'vitest';

import {
  lmeSessionToRounds,
  locomoSessionToRounds,
  locomoSessions,
  locomoGoldAnswer,
  parseLongMemEvalDate,
  parseLoCoMoDate,
} from '../dataset.js';
import type { LoCoMoSample } from '../types.js';

describe('parseLongMemEvalDate', () => {
  it('parses canonical LME timestamp', () => {
    expect(parseLongMemEvalDate('2023/05/30 (Tue) 23:40')).toBe('2023-05-30T23:40:00.000Z');
  });
  it('parses without weekday', () => {
    expect(parseLongMemEvalDate('2024/01/02 09:05')).toBe('2024-01-02T09:05:00.000Z');
  });
  it('returns undefined on bad input', () => {
    expect(parseLongMemEvalDate('garbage')).toBeUndefined();
    expect(parseLongMemEvalDate(undefined)).toBeUndefined();
  });
});

describe('parseLoCoMoDate', () => {
  it('parses pm', () => {
    expect(parseLoCoMoDate('1:56 pm on 8 May, 2023')).toBe('2023-05-08T13:56:00.000Z');
  });
  it('parses am', () => {
    expect(parseLoCoMoDate('11:00 am on 14 February, 2023')).toBe('2023-02-14T11:00:00.000Z');
  });
  it('handles abbreviated months', () => {
    expect(parseLoCoMoDate('9:30 am on 1 Jan, 2024')).toBe('2024-01-01T09:30:00.000Z');
  });
  it('returns undefined on bad input', () => {
    expect(parseLoCoMoDate('bogus')).toBeUndefined();
  });
});

describe('lmeSessionToRounds', () => {
  it('pairs strictly alternating user/assistant turns', () => {
    const rounds = lmeSessionToRounds([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'how are you' },
      { role: 'assistant', content: 'great' },
    ]);
    expect(rounds).toEqual([
      { user_message: 'hi', assistant_message: 'hello' },
      { user_message: 'how are you', assistant_message: 'great' },
    ]);
  });

  it('attaches started_at when provided', () => {
    const rounds = lmeSessionToRounds(
      [
        { role: 'user', content: 'q' },
        { role: 'assistant', content: 'a' },
      ],
      { sessionDateIso: '2023-05-30T23:40:00.000Z', questionId: 'q1', sessionIdx: 0 }
    );
    expect(rounds[0]?.started_at).toBe('2023-05-30T23:40:00.000Z');
  });

  it('merges consecutive same-role turns', () => {
    const rounds = lmeSessionToRounds([
      { role: 'user', content: 'part one' },
      { role: 'user', content: 'part two' },
      { role: 'assistant', content: 'ok' },
    ]);
    expect(rounds).toHaveLength(1);
    expect(rounds[0]?.user_message).toContain('part one');
    expect(rounds[0]?.user_message).toContain('part two');
  });

  it('emits a dangling final user round with empty assistant', () => {
    const rounds = lmeSessionToRounds([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q2' },
    ]);
    expect(rounds).toHaveLength(2);
    expect(rounds[1]).toMatchObject({ user_message: 'q2', assistant_message: '' });
  });

  it('handles leading assistant turn by synthesizing empty user', () => {
    const rounds = lmeSessionToRounds([
      { role: 'assistant', content: 'cold open' },
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'a' },
    ]);
    expect(rounds).toEqual([
      { user_message: '', assistant_message: 'cold open' },
      { user_message: 'q', assistant_message: 'a' },
    ]);
  });
});

describe('locomoSessions / locomoSessionToRounds', () => {
  const sample: LoCoMoSample = {
    sample_id: 'conv-1',
    qa: [],
    conversation: {
      speaker_a: 'Alice',
      speaker_b: 'Bob',
      session_1_date_time: '1:56 pm on 8 May, 2023',
      session_1: [
        { speaker: 'Alice', dia_id: 'D1:1', text: 'hi bob' },
        { speaker: 'Bob', dia_id: 'D1:2', text: 'hi alice' },
        { speaker: 'Bob', dia_id: 'D1:3', text: '(extra)' },
        { speaker: 'Alice', dia_id: 'D1:4', text: 'cool' },
      ],
      session_2_date_time: '9:00 am on 9 May, 2023',
      session_2: [
        { speaker: 'Alice', dia_id: 'D2:1', text: 'morning' },
        { speaker: 'Bob', dia_id: 'D2:2', text: 'morning!' },
      ],
    },
  };

  it('enumerates sessions in numeric order', () => {
    const sessions = locomoSessions(sample);
    expect(sessions.map((s) => s.index)).toEqual([1, 2]);
    expect(sessions[0]?.dateIso).toBe('2023-05-08T13:56:00.000Z');
    expect(sessions[1]?.dateIso).toBe('2023-05-09T09:00:00.000Z');
  });

  it('maps speaker_a → user / speaker_b → assistant and merges consecutive Bob turns', () => {
    const session = locomoSessions(sample)[0]!;
    const rounds = locomoSessionToRounds(session, sample);
    expect(rounds).toHaveLength(2);
    expect(rounds[0]?.user_message).toBe('hi bob');
    expect(rounds[0]?.assistant_message).toContain('hi alice');
    expect(rounds[0]?.assistant_message).toContain('(extra)');
    expect(rounds[1]).toMatchObject({ user_message: 'cool', assistant_message: '' });
    expect(rounds[0]?.started_at).toBe('2023-05-08T13:56:00.000Z');
  });

  it('flattens multimodal turns into [image: ...] text', () => {
    const localSample: LoCoMoSample = {
      sample_id: 'conv-2',
      qa: [],
      conversation: {
        speaker_a: 'Alice',
        speaker_b: 'Bob',
        session_1_date_time: '9:00 am on 1 May, 2023',
        session_1: [
          {
            speaker: 'Alice',
            dia_id: 'D1:1',
            text: 'check this out',
            blip_caption: 'a cat on a piano',
          },
          { speaker: 'Bob', dia_id: 'D1:2', text: 'cute' },
        ],
      },
    };
    const session = locomoSessions(localSample)[0]!;
    const rounds = locomoSessionToRounds(session, localSample);
    expect(rounds[0]?.user_message).toContain('[image: a cat on a piano]');
    expect(rounds[0]?.user_message).toContain('check this out');
  });
});

describe('locomoGoldAnswer', () => {
  it('stringifies number answers', () => {
    expect(locomoGoldAnswer({ question: 'q', answer: 42, category: 1 })).toBe('42');
  });
  it('joins array answers', () => {
    expect(locomoGoldAnswer({ question: 'q', answer: ['a', 'b'], category: 1 })).toBe('a, b');
  });
  it('falls back to adversarial_answer when no answer', () => {
    expect(
      locomoGoldAnswer({ question: 'q', category: 5, adversarial_answer: 'avoid me' } as never)
    ).toBe('avoid me');
  });
});
