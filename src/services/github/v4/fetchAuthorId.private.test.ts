import { ValidConfigOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { fetchAuthorId } from './fetchAuthorId';

describe('fetchAuthorId', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
  });

  describe('all = true', () => {
    it('returns null', async () => {
      const options = {
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        all: true,
      } as ValidConfigOptions;

      expect(await fetchAuthorId(options)).toEqual(null);
    });
  });

  describe('all = false', () => {
    it('returns author id', async () => {
      const options = {
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        all: false,
        author: 'sqren',
      } as ValidConfigOptions;

      expect(await fetchAuthorId(options)).toEqual('MDQ6VXNlcjIwOTk2Ng==');
    });
  });
});
