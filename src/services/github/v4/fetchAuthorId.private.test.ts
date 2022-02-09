import { ValidConfigOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { fetchAuthorId } from './fetchAuthorId';

describe('fetchAuthorId', () => {
  let devAccessToken: string;

  beforeAll(() => {
    devAccessToken = getDevAccessToken();
  });

  describe('author = null', () => {
    it('returns null', async () => {
      const options = {
        accessToken: devAccessToken,
        author: null,
      } as ValidConfigOptions;

      expect(await fetchAuthorId(options)).toEqual(null);
    });
  });

  describe('author is "sqren"', () => {
    it('returns author id', async () => {
      const options = {
        accessToken: devAccessToken,
        author: 'sqren',
      } as ValidConfigOptions;

      expect(await fetchAuthorId(options)).toEqual('MDQ6VXNlcjIwOTk2Ng==');
    });
  });
});
