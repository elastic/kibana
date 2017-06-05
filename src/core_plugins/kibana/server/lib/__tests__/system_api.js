import expect from 'expect.js';
import { isSystemApiRequest } from '../system_api';

describe('system_api', () => {
  describe('#isSystemApiRequest', () => {
    it ('returns true for a system API HTTP request', () => {
      const mockHapiRequest = {
        headers: {
          'kbn-system-api': true
        }
      };
      expect(isSystemApiRequest(mockHapiRequest)).to.be(true);
    });

    it ('returns false for a non-system API HTTP request', () => {
      const mockHapiRequest = {
        headers: {}
      };
      expect(isSystemApiRequest(mockHapiRequest)).to.be(false);
    });
  });
});
