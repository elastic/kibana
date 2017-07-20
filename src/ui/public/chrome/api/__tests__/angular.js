import { initAngularApi } from '../angular';
import { noop } from 'lodash';

describe('Chrome API :: Angular', () => {
  describe('location helper methods', () => {
    it('should return the sub app based on the url', () => {
      const chrome = {
        getInjected: noop,
        addBasePath: noop
      };
      initAngularApi(chrome, {
        devMode: true
      });
    });
    it('should return breadcrumbs based on the url', () => {
    });
  });
});
