import { throwOnInvalidAccessToken } from './throwOnInvalidAccessToken';

describe('throwOnInvalidAccessToken', () => {
  describe('when status code is', () => {
    it('should handle invalid access token', () => {
      const errorResponse = {
        status: 401,
        headers: {},
      } as any;

      return expect(() =>
        throwOnInvalidAccessToken({
          repoOwner: 'elastic',
          repoName: 'kibana',
          errorResponse,
        })
      ).toThrowError(
        'Please check your access token and make sure it is valid'
      );
    });

    it('should handle SSO error', () => {
      const errorResponse = {
        status: 200,
        headers: { 'x-github-sso': 'required; url=https://ssourl.com' },
        data: {
          errors: [{ type: 'FORBIDDEN' }],
        },
      } as any;

      return expect(() =>
        throwOnInvalidAccessToken({
          repoOwner: 'elastic',
          repoName: 'kibana',
          errorResponse,
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('should handle non-existing repo', () => {
      const errorResponse = {
        status: 200,
        headers: {
          'x-oauth-scopes': 'a,b,c',
          'x-accepted-oauth-scopes': 'a,b,c',
        },
        data: {
          errors: [{ type: 'NOT_FOUND' }],
        },
      } as any;

      return expect(() =>
        throwOnInvalidAccessToken({
          repoOwner: 'elastic',
          repoName: 'kibana',
          errorResponse,
        })
      ).toThrowError(`The repository "elastic/kibana" doesn't exist`);
    });

    it('should handle insufficient permissions (oauth scopes)', () => {
      const errorResponse = {
        status: 200,
        headers: {
          'x-oauth-scopes': 'a,b',
          'x-accepted-oauth-scopes': 'a,b,c',
        },
        data: {
          errors: [{ type: 'NOT_FOUND' }],
        },
      } as any;

      return expect(() =>
        throwOnInvalidAccessToken({
          repoOwner: 'elastic',
          repoName: 'kibana',
          errorResponse,
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('should not handle unknown cases', () => {
      const errorResponse = {
        status: 500,
        headers: {},
      } as any;

      return expect(
        throwOnInvalidAccessToken({
          repoOwner: 'elastic',
          repoName: 'kibana',
          errorResponse,
        })
      ).toBe(undefined);
    });
  });
});
