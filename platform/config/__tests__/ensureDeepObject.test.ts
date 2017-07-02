import { ensureDeepObject } from '../ensureDeepObject';

test('flat object', () => {
  const obj = {
    'foo.a': 1,
    'foo.b': 2
  }

  expect(ensureDeepObject(obj)).toEqual({
    foo: {
      a: 1,
      b: 2
    }
  })
});

test('deep object', () => {
  const obj = {
    foo: {
      a: 1,
      b: 2
    }
  }

  expect(ensureDeepObject(obj)).toEqual({
    foo: {
      a: 1,
      b: 2
    }
  })
});

test('flat within deep object', () => {
  const obj = {
    foo: {
      'bar.a': 1,
      b: 2
    }
  }

  expect(ensureDeepObject(obj)).toEqual({
    foo: {
      bar: {
        a: 1
      },
      b: 2
    }
  })
});

test('flat then flat object', () => {
  const obj = {
    'foo.bar': {
      'quux.a': 1,
      b: 2
    }
  }

  expect(ensureDeepObject(obj)).toEqual({
    foo: {
      bar: {
        quux: {
          a: 1
        },
        b: 2
      }
    }
  })
});
