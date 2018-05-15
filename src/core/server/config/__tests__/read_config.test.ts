import { getConfigFromFile } from '../read_config';

const fixtureFile = (name: string) => `${__dirname}/__fixtures__/${name}`;

test('reads yaml from file system and parses to json', () => {
  const config = getConfigFromFile(fixtureFile('config.yml'));

  expect(config).toEqual({
    pid: {
      enabled: true,
      file: '/var/run/kibana.pid',
    },
  });
});

test('returns a deep object', () => {
  const config = getConfigFromFile(fixtureFile('/config_flat.yml'));

  expect(config).toEqual({
    pid: {
      enabled: true,
      file: '/var/run/kibana.pid',
    },
  });
});
