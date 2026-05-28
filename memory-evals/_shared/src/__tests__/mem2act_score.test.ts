import { describe, expect, it } from 'vitest';

import { extractToolCalls, scoreMem2Act } from '../mem2act_score.js';
import type { ConverseResponse } from '../types.js';

describe('extractToolCalls', () => {
  it('returns empty array when there are no steps', () => {
    const r: ConverseResponse = {
      conversation_id: 'c',
      round_id: 'r',
      response: { message: 'hi' },
    };
    expect(extractToolCalls(r)).toEqual([]);
  });

  it('captures tool_call steps in order', () => {
    const r: ConverseResponse = {
      conversation_id: 'c',
      round_id: 'r',
      response: { message: 'done' },
      steps: [
        { type: 'reasoning', text: 'think' },
        {
          type: 'tool_call',
          tool_call_id: 'call1',
          tool_id: 'set_value',
          params: { key: 'B', value: 1 },
          results: [],
        },
        {
          type: 'tool_call',
          tool_call_id: 'call2',
          tool_id: 'lookup_contact',
          params: { name: 'Sarah' },
          results: [],
        },
      ],
    };
    const out = extractToolCalls(r);
    expect(out).toHaveLength(2);
    expect(out[0]?.tool_id).toBe('set_value');
    expect(out[0]?.params).toEqual({ key: 'B', value: 1 });
    expect(out[1]?.tool_call_id).toBe('call2');
  });

  it('also captures shape-less tool_call entries (no `type` field)', () => {
    const r: ConverseResponse = {
      conversation_id: 'c',
      round_id: 'r',
      response: { message: 'done' },
      steps: [{ tool_id: 'set_value', params: { x: 1 } }],
    };
    const out = extractToolCalls(r);
    expect(out).toHaveLength(1);
    expect(out[0]?.tool_id).toBe('set_value');
  });
});

describe('scoreMem2Act', () => {
  it('strict: perfect order + deep-equal params gets score 1 and f1=1', () => {
    const res = scoreMem2Act({
      mode: 'strict',
      gold: [
        { tool_id: 't1', params: { a: 1 } },
        { tool_id: 't2', params: { b: 'x' } },
      ],
      observed: [
        { tool_id: 't1', params: { a: 1 } },
        { tool_id: 't2', params: { b: 'x' } },
      ],
    });
    expect(res.score).toBe(1);
    expect(res.tool_match).toBe(2);
    expect(res.param_match).toBe(2);
    expect(res.f1).toBe(1);
  });

  it('strict: wrong order yields no exact matches', () => {
    const res = scoreMem2Act({
      mode: 'strict',
      gold: [
        { tool_id: 't1', params: { a: 1 } },
        { tool_id: 't2', params: { b: 'x' } },
      ],
      observed: [
        { tool_id: 't2', params: { b: 'x' } },
        { tool_id: 't1', params: { a: 1 } },
      ],
    });
    expect(res.score).toBe(0);
    expect(res.tool_match).toBe(0);
  });

  it('unordered: matches in any order', () => {
    const res = scoreMem2Act({
      mode: 'unordered',
      gold: [
        { tool_id: 't1', params: { a: 1 } },
        { tool_id: 't2', params: { b: 'x' } },
      ],
      observed: [
        { tool_id: 't2', params: { b: 'x' } },
        { tool_id: 't1', params: { a: 1 } },
      ],
    });
    expect(res.score).toBe(1);
    expect(res.param_match).toBe(2);
  });

  it('permissive: extra observed keys are tolerated', () => {
    const res = scoreMem2Act({
      mode: 'permissive',
      gold: [{ tool_id: 't1', params: { a: 1 } }],
      observed: [{ tool_id: 't1', params: { a: 1, extra: 'ok' } }],
    });
    expect(res.score).toBe(1);
    expect(res.param_match).toBe(1);
  });

  it('strict: extra observed keys break the match', () => {
    const res = scoreMem2Act({
      mode: 'strict',
      gold: [{ tool_id: 't1', params: { a: 1 } }],
      observed: [{ tool_id: 't1', params: { a: 1, extra: 'no' } }],
    });
    expect(res.score).toBe(0);
    expect(res.tool_match).toBe(1);
    expect(res.param_match).toBe(0);
  });

  it('extra observed calls drag score to 0 even when gold is fully matched', () => {
    const res = scoreMem2Act({
      mode: 'permissive',
      gold: [{ tool_id: 't1', params: { a: 1 } }],
      observed: [
        { tool_id: 't1', params: { a: 1 } },
        { tool_id: 't_extra', params: {} },
      ],
    });
    expect(res.score).toBe(0);
    expect(res.extra_calls).toHaveLength(1);
    expect(res.recall).toBe(1);
    expect(res.precision).toBe(0.5);
  });

  it('matchTrailingName=true: namespaced observed matches un-prefixed gold', () => {
    const res = scoreMem2Act({
      mode: 'permissive',
      matchTrailingName: true,
      gold: [{ tool_id: 'set_value', params: { x: 1 } }],
      observed: [{ tool_id: 'mem2act.set_value', params: { x: 1 } }],
    });
    expect(res.tool_match).toBe(1);
    expect(res.score).toBe(1);
  });

  it('reports missing gold calls when observed is empty', () => {
    const res = scoreMem2Act({
      mode: 'strict',
      gold: [{ tool_id: 't1' }],
      observed: [],
    });
    expect(res.score).toBe(0);
    expect(res.details[0]?.match).toBe('missing');
    expect(res.recall).toBe(0);
  });

  it('handles empty params on both sides', () => {
    const res = scoreMem2Act({
      mode: 'strict',
      gold: [{ tool_id: 't1' }],
      observed: [{ tool_id: 't1', params: {} }],
    });
    expect(res.score).toBe(1);
  });
});
