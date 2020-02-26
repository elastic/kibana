import axios from 'axios';
import { HandledError } from '../HandledError';
import { gqlRequest } from './gqlRequest';
import dedent from 'dedent';

describe('gqlRequest', () => {
  describe('when request succeeds', () => {
    let spy: jest.SpyInstance;
    beforeEach(() => {
      spy = jest.spyOn(axios, 'post').mockResolvedValue({
        data: {
          data: 'some data'
        }
      } as any);
    });

    it('should return correct response', async () => {
      expect(
        await gqlRequest({
          accessToken: 'myAccessToken',
          apiHostname: 'myApiHostname',
          query: 'myQuery',
          variables: {
            foo: 'bar'
          }
        })
      ).toEqual('some data');
    });

    it('should call with correct args', async () => {
      expect(spy).toHaveBeenCalledWith(
        'https://myApiHostname/graphql',
        {
          query: 'myQuery',
          variables: { foo: 'bar' }
        },
        {
          headers: {
            Authorization: 'bearer myAccessToken',
            'Content-Type': 'application/json'
          }
        }
      );
    });
  });

  describe('when request fails', () => {
    beforeEach(() => {
      jest.spyOn(axios, 'post').mockRejectedValue({
        response: {
          data: {
            errors: [{ message: 'some error' }, { message: 'some other error' }]
          }
        }
      } as any);
    });

    it('should return parsed github error', async () => {
      return expect(
        gqlRequest({
          accessToken: 'myAccessToken',
          apiHostname: 'myApiHostname',
          query: 'myQuery',
          variables: {
            foo: 'bar'
          }
        })
      ).rejects.toThrowError(
        new HandledError(
          dedent(`Unexpected response from Github:

          some error, some other error`)
        )
      );
    });
  });
});
