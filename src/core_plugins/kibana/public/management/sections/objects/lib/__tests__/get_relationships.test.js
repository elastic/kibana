import { getRelationships } from '../get_relationships';

describe('getRelationships', () => {
  it('should make an http request', async () => {
    const $http = jest.fn();
    const basePath = 'test';

    await getRelationships('dashboard', 1, $http, basePath);
    expect($http.mock.calls.length).toBe(1);
  });

  it('should handle succcesful responses', async () => {
    const $http = jest.fn().mockImplementation(() => ({ data: [1, 2] }));
    const basePath = 'test';

    const response = await getRelationships('dashboard', 1, $http, basePath);
    expect(response).toEqual([1, 2]);
  });

  it('should handle errors', async () => {
    const $http = jest.fn().mockImplementation(() => {
      throw {
        data: {
          error: 'Test error',
          statusCode: 500,
        },
      };
    });
    const basePath = 'test';

    try {
      await getRelationships('dashboard', 1, $http, basePath);
    } catch (e) {
      // There isn't a great way to handle throwing exceptions
      // with async/await but this seems to work :shrug:
      expect(() => {
        throw e;
      }).toThrow();
    }
  });
});
