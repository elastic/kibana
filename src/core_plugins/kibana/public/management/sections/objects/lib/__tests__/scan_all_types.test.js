import { scanAllTypes } from '../scan_all_types';

jest.mock('ui/chrome', () => ({
  addBasePath: () => 'apiUrl',
}));

describe('scanAllTypes', () => {
  it('should call the api', async () => {
    const $http = {
      post: jest.fn().mockImplementation(() => ([]))
    };
    const typesToInclude = ['index-pattern', 'dashboard'];

    await scanAllTypes($http, typesToInclude);
    expect($http.post).toBeCalledWith('apiUrl/export', { typesToInclude });
  });
});
