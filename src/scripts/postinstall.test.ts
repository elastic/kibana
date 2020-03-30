import * as globalConfig from '../options/config/globalConfig';
import { postinstall } from './postinstall';

describe('postinstall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create global config if it doesn't exist", async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const maybeCreateGlobalConfigAndFolderSpy = jest
      .spyOn(globalConfig, 'maybeCreateGlobalConfigAndFolder')
      .mockResolvedValue(true);

    await postinstall();
    expect(maybeCreateGlobalConfigAndFolderSpy).toBeCalledTimes(1);
    expect(consoleSpy).toBeCalledWith(
      'Global config successfully created in /myHomeDir/.backport/config.json'
    );
  });

  it('should not create global config if it already exists', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const maybeCreateGlobalConfigAndFolderSpy = jest
      .spyOn(globalConfig, 'maybeCreateGlobalConfigAndFolder')
      .mockResolvedValue(false);

    await postinstall();
    expect(maybeCreateGlobalConfigAndFolderSpy).toBeCalledTimes(1);
    expect(consoleSpy).toBeCalledTimes(0);
  });
});
