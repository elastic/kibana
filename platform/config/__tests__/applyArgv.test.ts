import { applyArgv } from '../applyArgv';

test('can override port', () => {
  const argv = {
    port: 123
  };
  const config = {
    server: {
      port: 5601,
      host: 'localhost'
    }
  }

  expect(applyArgv(argv, config)).toEqual({
    server: {
      port: 123,
      host: 'localhost'
    }
  });
});

test('can override host', () => {
  const argv = {
    host: 'example.org'
  };
  const config = {
    server: {
      port: 5601,
      host: 'localhost'
    }
  }

  expect(applyArgv(argv, config)).toEqual({
    server: {
      port: 5601,
      host: 'example.org'
    }
  });
});
