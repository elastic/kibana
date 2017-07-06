import { get } from '../get';

const obj = {
  foo: 'value',
  bar: {
    quux: 123
  },
  'dotted.value': 'dots'
};

test('get with string', () => {
  const value = get(obj, 'foo');
  expect(value).toBe('value');
});

test('get with array', () => {
  const value = get(obj, ['bar', 'quux']);
  expect(value).toBe(123);
});

test('throws if dot in string', () => {
  expect(() => {
    get(obj, 'dotted.value');
  }).toThrowErrorMatchingSnapshot();
});

test('does not throw if dot in array', () => {
  const value = get(obj, ['dotted.value']);
  expect(value).toBe('dots');
});
