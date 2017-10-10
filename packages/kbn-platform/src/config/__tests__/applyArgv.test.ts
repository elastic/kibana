import { ObjectToRawConfigAdapter } from '..';
import { overrideConfigWithArgv } from '../../cli/overrideConfigWithArgv';

test('port', () => {
  const argv = {
    port: 123
  };

  const config = new ObjectToRawConfigAdapter({
    server: { port: 456 }
  });

  overrideConfigWithArgv(config, argv);

  expect(config.get('server.port')).toEqual(123);
});

test('host', () => {
  const argv = {
    host: 'example.org'
  };

  const config = new ObjectToRawConfigAdapter({
    server: { host: 'org.example' }
  });

  overrideConfigWithArgv(config, argv);

  expect(config.get('server.host')).toEqual('example.org');
});

test('ignores unknown', () => {
  const argv = {
    unknown: 'some value'
  };

  const config = new ObjectToRawConfigAdapter({});
  jest.spyOn(config, 'set');

  overrideConfigWithArgv(config, argv);

  expect(config.set).not.toHaveBeenCalled();
});
