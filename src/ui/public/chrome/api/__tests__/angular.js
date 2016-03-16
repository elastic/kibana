import expect from 'expect.js';

import kbnAngular from '../angular';
import TabFakeStore from '../../__tests__/_TabFakeStore';
import { noop } from 'lodash';

describe('Chrome API :: Angular', () => {
  describe('location helper methods', () => {
    it('should return the sub app based on the url', () => {
      const chrome = {
        getInjected: noop,
        addBasePath: noop
      };
      kbnAngular(chrome, {});
      debugger;
    });
    it('should return breadcrumbs based on the url', () => {
    });
  });
});
