import axios from 'axios';
import { BackportOptions } from '../../options/options';
import { verifyAccessToken } from './verifyAccessToken';
import { getDefaultOptions } from '../../test/getDefaultOptions';

describe('verifyAccessToken', () => {
  let options: BackportOptions;
  beforeEach(() => {
    options = {
      accessToken: 'myAccessToken',
      apiHostname: 'api.github.com',
      repoName: 'kibana',
      repoOwner: 'elastic'
    } as BackportOptions;
  });

  it('should call verifyAccessToken with correct url', async () => {
    const spy = jest.spyOn(axios, 'head').mockResolvedValue('hi' as any);
    await verifyAccessToken(getDefaultOptions(options));

    expect(spy).toHaveBeenCalledWith(
      'https://api.github.com/repos/elastic/kibana?access_token=myAccessToken'
    );
  });

  describe('when status code is', () => {
    it('401', () => {
      jest.spyOn(axios, 'head').mockRejectedValue({
        response: {
          status: 401
        }
      });

      return expect(verifyAccessToken(options)).rejects.toThrowError(
        'Please check your access token and make sure it is valid'
      );
    });

    it('403 (unknown error)', () => {
      jest.spyOn(axios, 'head').mockRejectedValue({
        message: 'unknown error',
        response: {
          status: 403
        }
      });

      return expect(verifyAccessToken(options)).rejects.toThrowError(
        'Error while verifying access token: unknown error'
      );
    });

    it('403 (SSO error)', () => {
      jest.spyOn(axios, 'head').mockRejectedValue({
        response: {
          headers: {
            'x-github-sso': 'required; url=https://ssourl.com'
          },
          status: 403
        }
      });

      return expect(verifyAccessToken(options)).rejects.toMatchInlineSnapshot(`
                                                              [HandledError: Please follow the link to authorize your personal access token with SSO:

                                                              https://ssourl.com]
                                                      `);
    });

    it('404 (repo does not exist)', () => {
      jest.spyOn(axios, 'head').mockRejectedValue({
        response: {
          headers: {
            'x-oauth-scopes': 'a,b,c',
            'x-accepted-oauth-scopes': 'a,b,c'
          },
          status: 404
        }
      });

      return expect(verifyAccessToken(options)).rejects.toMatchInlineSnapshot(
        `[HandledError: The repository "elastic/kibana" doesn't exist]`
      );
    });

    it('404 (insufficient permissions)', () => {
      jest.spyOn(axios, 'head').mockRejectedValue({
        response: {
          headers: {
            'x-oauth-scopes': 'a,b',
            'x-accepted-oauth-scopes': 'a,b,c'
          },
          status: 404
        }
      });

      return expect(verifyAccessToken(options)).rejects.toMatchInlineSnapshot(`
                                  [HandledError: You do not have access to the repository "elastic/kibana". Please make sure your access token has the required scopes.

                                  Required scopes: a,b,c
                                  Access token scopes: a,b]
                              `);
    });

    it('any other status code', () => {
      jest.spyOn(axios, 'head').mockRejectedValue({
        message: 'unknown error',
        response: {
          status: 500
        }
      });

      return expect(verifyAccessToken(options)).rejects.toThrowError(
        'Error while verifying access token: unknown error'
      );
    });
  });
});
