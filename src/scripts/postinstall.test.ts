import * as globalConfig from '../options/config/globalConfig';
import * as logger from '../services/logger';
import { postinstall } from './postinstall';

describe('postinstall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create global config if it doesn't exist", async () => {
    const createGlobalConfigAndFolderIfNotExistSpy = jest
      .spyOn(globalConfig, 'createGlobalConfigAndFolderIfNotExist')
      .mockResolvedValueOnce(true);

    await postinstall();
    expect(createGlobalConfigAndFolderIfNotExistSpy).toBeCalledTimes(1);
    expect(logger.consoleLog).toBeCalledWith(
      'Global config successfully created in /myHomeDir/.backport/config.json'
    );
  });

  it('should not create global config if it already exists', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const createGlobalConfigAndFolderIfNotExistSpy = jest
      .spyOn(globalConfig, 'createGlobalConfigAndFolderIfNotExist')
      .mockResolvedValueOnce(false);

    await postinstall();
    expect(createGlobalConfigAndFolderIfNotExistSpy).toBeCalledTimes(1);
    expect(consoleSpy).toBeCalledTimes(0);
  });
});
