import nock from 'nock';
import { mockGqlRequest } from '../../../test/nockHelpers';
import { HandledError } from '../../HandledError';
import { apiRequestV4 } from './apiRequestV4';

describe('apiRequestV4', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('when request succeeds', () => {
    let res: unknown;
    let commitsByAuthorCalls: ReturnType<typeof mockGqlRequest>;
    beforeEach(async () => {
      commitsByAuthorCalls = mockGqlRequest({
        name: 'MyQuery',
        statusCode: 200,
        body: { data: { hello: 'world' } },
      });

      res = await apiRequestV4({
        accessToken: 'myAccessToken',
        githubApiBaseUrlV4: 'http://localhost/graphql',
        query: 'query MyQuery{ foo }',
        variables: { foo: 'bar' },
      });
    });

    it('should return correct response', async () => {
      expect(res).toEqual({ hello: 'world' });
    });

    it('should call with correct args', async () => {
      expect(commitsByAuthorCalls).toEqual([
        {
          query: 'query MyQuery{ foo }',
          variables: { foo: 'bar' },
        },
      ]);
    });
  });

  describe('when request fails with error messages', () => {
    beforeEach(() => {
      mockGqlRequest({
        name: 'MyQuery',
        statusCode: 500,
        body: {
          errors: [{ message: 'some error' }, { message: 'some other error' }],
        },
      });
    });

    it('should return parsed github error', async () => {
      return expect(
        apiRequestV4({
          accessToken: 'myAccessToken',
          githubApiBaseUrlV4: 'http://localhost/graphql',
          query: 'query MyQuery{ foo }',
          variables: {
            foo: 'bar',
          },
        })
      ).rejects.toThrowError(
        new HandledError(`some error, some other error (Github v4)`)
      );
    });
  });

  describe('when request fails without error messages', () => {
    beforeEach(() => {
      mockGqlRequest({
        name: 'MyQuery',
        statusCode: 500,
        body: { data: { foo: 'bar' } },
      });
    });

    it('should return parsed github error', async () => {
      return expect(
        apiRequestV4({
          accessToken: 'myAccessToken',
          githubApiBaseUrlV4: 'http://localhost/graphql',
          query: 'query MyQuery{ foo }',
          variables: {
            foo: 'bar',
          },
        })
      ).rejects.toThrowErrorMatchingSnapshot();
    });
  });
});
