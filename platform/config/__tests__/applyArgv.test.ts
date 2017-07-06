import { argvToConfigOverrides } from '../../cli/argvToConfig';

test('port', () => {
  const argv = {
    port: 123
  };

  expect(argvToConfigOverrides(argv)).toEqual({
    server: {
      port: 123
    }
  });
});

test('host', () => {
  const argv = {
    host: 'example.org'
  };

  expect(argvToConfigOverrides(argv)).toEqual({
    server: {
      host: 'example.org'
    }
  });
});

test('ignores unknown', () => {
  const argv = {
    unknown: 'some value'
  };

  expect(argvToConfigOverrides(argv)).toEqual({});
});
