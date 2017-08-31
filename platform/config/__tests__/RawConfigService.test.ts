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

  expect(exampleConfig).toEqual({ key: 'value' });
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

  expect(valuesReceived).toEqual([{ key: 'value' }]);
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

  expect(valuesReceived).toEqual([{ key: 'value' }, { key: 'new value' }]);
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
