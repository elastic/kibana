import del from 'del';
import makeDir = require('make-dir');
import { ValidConfigOptions } from '../options/options';
import { maybeSetupRepo } from './maybeSetupRepo';

describe('maybeSetupRepo', () => {
  it('should delete repo if an error occurs', async () => {
    expect.assertions(2);
    ((makeDir as any) as jest.Mock).mockImplementationOnce(() => {
      throw new Error('makeDir failed');
    });

    await expect(
      maybeSetupRepo({
        repoOwner: 'elastic',
        repoName: 'kibana',
        username: 'sqren',
        accessToken: 'myAccessToken',
        gitHostname: 'github.com',
      } as ValidConfigOptions)
    ).rejects.toThrowError('makeDir failed');

    expect(del).toHaveBeenCalledWith(
      '/myHomeDir/.backport/repositories/elastic/kibana'
    );
  });
});
