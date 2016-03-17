import expect from 'expect.js';
import ngMock from 'ng_mock';

import kbnAngular from '../angular';
import { noop } from 'lodash';



let $location;

describe('Chrome API :: Angular', () => {
  describe('location helper methods', () => {
    beforeEach(() => {
      ngMock.module('kibana');
      ngMock.inject($injector => {
        $location = $injector.get('$location');
      });
    });
    it('should return the sub app based on the url', () => {
      const chrome = {
        getInjected: noop,
        addBasePath: noop
      };
      kbnAngular(chrome, {});
      $location.url('foo/bar');
      expect(chrome.getFirstPathSegment()).to.equal('foo');
    });
    it('should return breadcrumbs based on the url', () => {
      const sample = ['foo', 'bar'];
      const chrome = {
        getInjected: noop,
        addBasePath: noop
      };
      kbnAngular(chrome, {});
      $location.url(sample.join('/'));
      expect(chrome.getFirstPathSegment()).to.equal(sample);
    });
  });
});
