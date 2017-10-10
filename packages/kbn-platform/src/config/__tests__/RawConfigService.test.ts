const mockGetConfigFromFile = jest.fn();

jest.mock('../readConfig', () => ({
  getConfigFromFile: mockGetConfigFromFile
}));

import { RawConfigService } from '../RawConfigService';

const configFile = '/config/kibana.yml';

beforeEach(() => {
  mockGetConfigFromFile.mockReset();
  mockGetConfigFromFile.mockImplementation(() => ({}));
});

test('loads raw config when started', () => {
  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  expect(mockGetConfigFromFile).toHaveBeenCalledTimes(1);
  expect(mockGetConfigFromFile).toHaveBeenLastCalledWith(configFile);
});

test('re-reads the config when reloading', () => {
  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  mockGetConfigFromFile.mockClear();
  mockGetConfigFromFile.mockImplementation(() => ({ foo: 'bar' }));

  configService.reloadConfig();

  expect(mockGetConfigFromFile).toHaveBeenCalledTimes(1);
  expect(mockGetConfigFromFile).toHaveBeenLastCalledWith(configFile);
});

test('returns config at path as observable', async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  const exampleConfig = await configService
    .getConfig$()
    .first()
    .toPromise();

  expect(exampleConfig.get('key')).toEqual('value');
  expect(exampleConfig.getFlattenedPaths()).toEqual(['key']);
});

test("does not push new configs when reloading if config at path hasn't changed", async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  const valuesReceived: any[] = [];
  configService.getConfig$().subscribe(config => {
    valuesReceived.push(config);
  });

  mockGetConfigFromFile.mockClear();
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  configService.reloadConfig();

  expect(valuesReceived).toHaveLength(1);
  expect(valuesReceived[0].get('key')).toEqual('value');
  expect(valuesReceived[0].getFlattenedPaths()).toEqual(['key']);
});

test('pushes new config when reloading and config at path has changed', async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  const valuesReceived: any[] = [];
  configService.getConfig$().subscribe(config => {
    valuesReceived.push(config);
  });

  mockGetConfigFromFile.mockClear();
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'new value' }));

  configService.reloadConfig();

  expect(valuesReceived).toHaveLength(2);
  expect(valuesReceived[0].get('key')).toEqual('value');
  expect(valuesReceived[0].getFlattenedPaths()).toEqual(['key']);
  expect(valuesReceived[1].get('key')).toEqual('new value');
  expect(valuesReceived[1].getFlattenedPaths()).toEqual(['key']);
});

test('completes config observables when stopped', done => {
  expect.assertions(0);

  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  configService.getConfig$().subscribe({
    complete: () => done()
  });

  configService.stop();
});
