import { describe, expect, it } from 'vitest';

import { boolFlag, numberFlag, parseArgs, requireFlag, splitList } from '../cli.js';

describe('parseArgs', () => {
  it('parses --key value and --key=value', () => {
    expect(parseArgs(['--a', '1', '--b=2'])).toEqual({ a: '1', b: '2' });
  });

  it('treats listed flags as booleans', () => {
    expect(parseArgs(['--dry-run', '--questions', '5'], { booleanFlags: ['dry-run'] })).toEqual({
      'dry-run': true,
      questions: '5',
    });
  });

  it('splits array flags', () => {
    expect(
      parseArgs(['--question-types', 'a,b,c'], { arrayFlags: ['question-types'] })
    ).toEqual({ 'question-types': ['a', 'b', 'c'] });
  });

  it('applies defaults', () => {
    const out = parseArgs([], { flags: { 'run-id': { default: 'r' } } });
    expect(out['run-id']).toBe('r');
  });

  it('stops parsing at --', () => {
    expect(parseArgs(['--a', '1', '--', '--b', '2'])).toEqual({ a: '1' });
  });
});

describe('helpers', () => {
  it('requireFlag throws on missing', () => {
    expect(() => requireFlag({}, 'x')).toThrow(/--x/);
  });
  it('numberFlag parses or throws', () => {
    expect(numberFlag({ a: '3' }, 'a')).toBe(3);
    expect(numberFlag({}, 'a', 7)).toBe(7);
    expect(() => numberFlag({ a: 'nope' }, 'a')).toThrow();
  });
  it('boolFlag coerces strings', () => {
    expect(boolFlag({ a: 'true' }, 'a')).toBe(true);
    expect(boolFlag({ a: 'false' }, 'a')).toBe(false);
    expect(boolFlag({}, 'a', true)).toBe(true);
  });
  it('splitList trims and drops empties', () => {
    expect(splitList(' a , b ,,c ')).toEqual(['a', 'b', 'c']);
  });
});
