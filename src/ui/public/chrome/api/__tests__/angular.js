import expect from 'expect.js';

import kbnAngular from '../angular';
import TabFakeStore from '../../__tests__/_tab_fake_store';
import { noop } from 'lodash';

describe('Chrome API :: Angular', () => {
  describe('location helper methods', () => {
    it('should return the sub app based on the url', () => {
      const chrome = {
        getInjected: noop,
        addBasePath: noop
      };
      kbnAngular(chrome, {});
    });
    it('should return breadcrumbs based on the url', () => {
    });
  });
});
