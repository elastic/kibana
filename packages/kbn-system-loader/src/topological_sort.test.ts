import { topologicalSort } from './topological_sort';

test('returns a topologically ordered sequence', () => {
  const nodes = new Map([
    ['a', []],
    ['b', ['a']],
    ['c', ['a', 'b']],
    ['d', ['a']],
  ]);

  let sorted = topologicalSort(nodes);

  expect(sorted).toBeDefined();

  expect([...sorted!]).toEqual(['a', 'd', 'b', 'c']);
});

test('handles multiple "roots" with no deps', () => {
  const nodes = new Map([
    ['a', []],
    ['b', []],
    ['c', ['a', 'b']],
    ['d', ['a']],
  ]);

  let sorted = topologicalSort(nodes);

  expect(sorted).toBeDefined();

  expect([...sorted!]).toEqual(['b', 'a', 'd', 'c']);
});

test('throws if ordering does not succeed', () => {
  const nodes = new Map([
    ['a', ['b']],
    ['b', ['c']],
    ['c', ['a', 'd']], // cycles back to 'a'
    ['d', []],
    ['e', ['d']],
    ['f', ['g']], // 'g' does not 'exist'
  ]);

  expect(() => {
    topologicalSort(nodes);
  }).toThrowErrorMatchingSnapshot();
});
