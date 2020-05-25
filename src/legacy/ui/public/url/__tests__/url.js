/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import sinon from 'sinon';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import faker from 'faker';
import _ from 'lodash';
import { AppStateProvider } from '../../state_management/app_state';
import '..';

// global vars, injected and mocked in init()
let kbnUrl;
let $route;
let $location;
let $rootScope;
let appState;

class StubAppState {
  constructor() {
    this.getQueryParamName = () => '_a';
    this.toQueryParam = () => 'stateQueryParam';
    this.destroy = sinon.stub();
  }
}

function init() {
  ngMock.module('kibana/url', 'kibana', function ($provide, PrivateProvider) {
    $provide.service('$route', function () {
      return {
        reload: _.noop,
      };
    });

    appState = new StubAppState();
    PrivateProvider.swap(AppStateProvider, ($decorate) => {
      const AppState = $decorate();
      AppState.getAppState = () => appState;
      return AppState;
    });
  });

  ngMock.inject(function ($injector) {
    $route = $injector.get('$route');
    $location = $injector.get('$location');
    $rootScope = $injector.get('$rootScope');
    kbnUrl = $injector.get('kbnUrl');
  });
}

describe('kbnUrl', function () {
  beforeEach(function () {
    init();
  });

  describe('forcing reload', function () {
    it('schedules a listener for $locationChangeSuccess on the $rootScope', function () {
      $location.url('/url');
      $route.current = {
        $$route: {
          regex: /.*/,
        },
      };

      sinon.stub($rootScope, '$on');

      expect($rootScope.$on.callCount).to.be(0);
      kbnUrl.change('/url');
      sinon.assert.calledOnce(appState.destroy);
      expect($rootScope.$on.callCount).to.be(1);
      expect($rootScope.$on.firstCall.args[0]).to.be('$locationChangeSuccess');
    });

    it('handler unbinds the listener and calls reload', function () {
      $location.url('/url');
      $route.current = {
        $$route: {
          regex: /.*/,
        },
      };

      const unbind = sinon.stub();
      sinon.stub($rootScope, '$on').returns(unbind);
      $route.reload = sinon.stub();

      expect($rootScope.$on.callCount).to.be(0);
      kbnUrl.change('/url');
      expect($rootScope.$on.callCount).to.be(1);

      const handler = $rootScope.$on.firstCall.args[1];
      handler();
      expect(unbind.callCount).to.be(1);
      expect($route.reload.callCount).to.be(1);
    });

    it('reloads requested before the first are ignored', function () {
      $location.url('/url');
      $route.current = {
        $$route: {
          regex: /.*/,
        },
      };
      $route.reload = sinon.stub();

      sinon.stub($rootScope, '$on').returns(sinon.stub());

      expect($rootScope.$on.callCount).to.be(0);
      kbnUrl.change('/url');
      expect($rootScope.$on.callCount).to.be(1);

      // don't call the first handler

      kbnUrl.change('/url');
      expect($rootScope.$on.callCount).to.be(1);
    });

    it('one reload can happen once the first has completed', function () {
      $location.url('/url');
      $route.current = {
        $$route: {
          regex: /.*/,
        },
      };
      $route.reload = sinon.stub();

      sinon.stub($rootScope, '$on').returns(sinon.stub());

      expect($rootScope.$on.callCount).to.be(0);
      kbnUrl.change('/url');
      expect($rootScope.$on.callCount).to.be(1);

      // call the first handler
      $rootScope.$on.firstCall.args[1]();
      expect($route.reload.callCount).to.be(1);

      expect($rootScope.$on.callCount).to.be(1);
      kbnUrl.change('/url');
      expect($rootScope.$on.callCount).to.be(2);
    });
  });

  describe('remove', function () {
    it('removes a parameter with a value from the url', function () {
      $location.url('/myurl?exist&WithAParamToRemove=2&anothershouldexist=5');
      kbnUrl.removeParam('WithAParamToRemove');
      expect($location.url()).to.be('/myurl?exist&anothershouldexist=5');
    });

    it('removes a parameter with no value from the url', function () {
      $location.url('/myurl?removeme&hi=5');
      kbnUrl.removeParam('removeme');
      expect($location.url()).to.be('/myurl?hi=5');
    });

    it('is noop if the given parameter doesn\t exist in the url', function () {
      $location.url('/myurl?hi&bye');
      kbnUrl.removeParam('noexist');
      expect($location.url()).to.be('/myurl?hi&bye');
    });

    it('is noop if given empty string param', function () {
      $location.url('/myurl?hi&bye');
      kbnUrl.removeParam('');
      expect($location.url()).to.be('/myurl?hi&bye');
    });
  });

  describe('change', function () {
    it('should set $location.url', function () {
      sinon.stub($location, 'url');

      expect($location.url.callCount).to.be(0);
      kbnUrl.change('/some-url');
      expect($location.url.callCount).to.be(1);
    });

    it('should uri encode replaced params', function () {
      const url = '/some/path/';
      const params = { replace: faker.Lorem.words(3).join(' ') };
      const check = encodeURIComponent(params.replace);
      sinon.stub($location, 'url');

      kbnUrl.change(url + '{{replace}}', params);

      expect($location.url.firstCall.args[0]).to.be(url + check);
    });

    it('should parse angular expression in substitutions and uri encode the results', function () {
      // build url by piecing together these parts
      const urlParts = ['/', '/', '?', '&', '#'];
      // make sure it can parse templates with weird spacing
      const wrappers = [
        ['{{', '}}'],
        ['{{ ', ' }}'],
        ['{{', '  }}'],
        ['{{    ', '}}'],
        ['{{    ', '         }}'],
      ];
      // make sure filters are evaluated via angular expressions
      const objIndex = 4; // used to case one replace as an object
      const filters = ['', 'uppercase', '', 'uppercase', ''];

      // the words (template keys) used must all be unique
      const words = _.uniq(faker.Lorem.words(10))
        .slice(0, urlParts.length)
        .map(function (word, i) {
          if (filters[i].length) {
            return word + '|' + filters[i];
          }
          return word;
        });

      const replacements = faker.Lorem.words(urlParts.length).map(function (word, i) {
        // make selected replacement into an object
        if (i === objIndex) {
          return { replace: word };
        }

        return word;
      });

      // build the url and test url
      let url = '';
      let testUrl = '';
      urlParts.forEach(function (part, i) {
        url += part + wrappers[i][0] + words[i] + wrappers[i][1];
        const locals = {};
        locals[words[i].split('|')[0]] = replacements[i];
        testUrl += part + encodeURIComponent($rootScope.$eval(words[i], locals));
      });

      // create the locals replacement object
      const params = {};
      replacements.forEach(function (replacement, i) {
        const word = words[i].split('|')[0];
        params[word] = replacement;
      });

      sinon.stub($location, 'url');

      kbnUrl.change(url, params);

      expect($location.url.firstCall.args[0]).to.not.be(url);
      expect($location.url.firstCall.args[0]).to.be(testUrl);
    });

    it('should handle dot notation', function () {
      const url = '/some/thing/{{that.is.substituted}}';

      kbnUrl.change(url, {
        that: {
          is: {
            substituted: 'test',
          },
        },
      });

      expect($location.url()).to.be('/some/thing/test');
    });

    it('should throw when params are missing', function () {
      const url = '/{{replace_me}}';
      const params = {};

      try {
        kbnUrl.change(url, params);
        throw new Error('this should not run');
      } catch (err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.match(/replace_me/);
      }
    });

    it('should throw when filtered params are missing', function () {
      const url = '/{{replace_me|number}}';
      const params = {};

      try {
        kbnUrl.change(url, params);
        throw new Error('this should not run');
      } catch (err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.match(/replace_me\|number/);
      }
    });

    it('should change the entire url', function () {
      const path = '/test/path';
      const search = { search: 'test' };
      const hash = 'hash';
      const newPath = '/new/location';

      $location.path(path).search(search).hash(hash);

      // verify the starting state
      expect($location.path()).to.be(path);
      expect($location.search()).to.eql(search);
      expect($location.hash()).to.be(hash);

      kbnUrl.change(newPath);

      // verify the ending state
      expect($location.path()).to.be(newPath);
      expect($location.search()).to.eql({});
      expect($location.hash()).to.be('');
    });

    it('should allow setting app state on the target url', function () {
      const path = '/test/path';
      const search = { search: 'test' };
      const hash = 'hash';
      const newPath = '/new/location';

      $location.path(path).search(search).hash(hash);

      // verify the starting state
      expect($location.path()).to.be(path);
      expect($location.search()).to.eql(search);
      expect($location.hash()).to.be(hash);

      kbnUrl.change(newPath, null, new StubAppState());

      // verify the ending state
      expect($location.path()).to.be(newPath);
      expect($location.search()).to.eql({ _a: 'stateQueryParam' });
      expect($location.hash()).to.be('');
    });
  });

  describe('changePath', function () {
    it('should change just the path', function () {
      const path = '/test/path';
      const search = { search: 'test' };
      const hash = 'hash';
      const newPath = '/new/location';

      $location.path(path).search(search).hash(hash);

      // verify the starting state
      expect($location.path()).to.be(path);
      expect($location.search()).to.eql(search);
      expect($location.hash()).to.be(hash);

      kbnUrl.changePath(newPath);

      // verify the ending state
      expect($location.path()).to.be(newPath);
      expect($location.search()).to.eql(search);
      expect($location.hash()).to.be(hash);
    });
  });

  describe('redirect', function () {
    it('should change the entire url', function () {
      const path = '/test/path';
      const search = { search: 'test' };
      const hash = 'hash';
      const newPath = '/new/location';

      $location.path(path).search(search).hash(hash);

      // verify the starting state
      expect($location.path()).to.be(path);
      expect($location.search()).to.eql(search);
      expect($location.hash()).to.be(hash);

      kbnUrl.redirect(newPath);

      // verify the ending state
      expect($location.path()).to.be(newPath);
      expect($location.search()).to.eql({});
      expect($location.hash()).to.be('');
    });

    it('should allow setting app state on the target url', function () {
      const path = '/test/path';
      const search = { search: 'test' };
      const hash = 'hash';
      const newPath = '/new/location';

      $location.path(path).search(search).hash(hash);

      // verify the starting state
      expect($location.path()).to.be(path);
      expect($location.search()).to.eql(search);
      expect($location.hash()).to.be(hash);

      kbnUrl.redirect(newPath, null, new StubAppState());

      // verify the ending state
      expect($location.path()).to.be(newPath);
      expect($location.search()).to.eql({ _a: 'stateQueryParam' });
      expect($location.hash()).to.be('');
    });

    it('should replace the current history entry', function () {
      sinon.stub($location, 'replace');
      $location.url('/some/path');

      expect($location.replace.callCount).to.be(0);
      kbnUrl.redirect('/new/path/');
      expect($location.replace.callCount).to.be(1);
    });

    it('should call replace on $location', function () {
      sinon.stub(kbnUrl, '_shouldForceReload').returns(false);
      sinon.stub($location, 'replace');

      expect($location.replace.callCount).to.be(0);
      kbnUrl.redirect('/poop');
      expect($location.replace.callCount).to.be(1);
    });
  });

  describe('redirectPath', function () {
    it('should only change the path', function () {
      const path = '/test/path';
      const search = { search: 'test' };
      const hash = 'hash';
      const newPath = '/new/location';

      $location.path(path).search(search).hash(hash);

      // verify the starting state
      expect($location.path()).to.be(path);
      expect($location.search()).to.eql(search);
      expect($location.hash()).to.be(hash);

      kbnUrl.redirectPath(newPath);

      // verify the ending state
      expect($location.path()).to.be(newPath);
      expect($location.search()).to.eql(search);
      expect($location.hash()).to.be(hash);
    });

    it('should call replace on $location', function () {
      sinon.stub(kbnUrl, '_shouldForceReload').returns(false);
      sinon.stub($location, 'replace');

      expect($location.replace.callCount).to.be(0);
      kbnUrl.redirectPath('/poop');
      expect($location.replace.callCount).to.be(1);
    });
  });

  describe('_shouldForceReload', function () {
    let next;
    let prev;

    beforeEach(function () {
      $route.current = {
        $$route: {
          regexp: /^\/is-current-route\/(\d+)/,
          reloadOnSearch: true,
        },
      };

      prev = { path: '/is-current-route/1', search: {} };
      next = { path: '/is-current-route/1', search: {} };
    });

    it("returns false if the passed url doesn't match the current route", function () {
      next.path = '/not current';
      expect(kbnUrl._shouldForceReload(next, prev, $route)).to.be(false);
    });

    describe('if the passed url does match the route', function () {
      describe('and the route reloads on search', function () {
        describe('and the path is the same', function () {
          describe('and the search params are the same', function () {
            it('returns true', function () {
              expect(kbnUrl._shouldForceReload(next, prev, $route)).to.be(true);
            });
          });
          describe('but the search params are different', function () {
            it('returns false', function () {
              next.search = {};
              prev.search = { q: 'search term' };
              expect(kbnUrl._shouldForceReload(next, prev, $route)).to.be(false);
            });
          });
        });

        describe('and the path is different', function () {
          beforeEach(function () {
            next.path = '/not-same';
          });

          describe('and the search params are the same', function () {
            it('returns false', function () {
              expect(kbnUrl._shouldForceReload(next, prev, $route)).to.be(false);
            });
          });
          describe('but the search params are different', function () {
            it('returns false', function () {
              next.search = {};
              prev.search = { q: 'search term' };
              expect(kbnUrl._shouldForceReload(next, prev, $route)).to.be(false);
            });
          });
        });
      });

      describe('but the route does not reload on search', function () {
        beforeEach(function () {
          $route.current.$$route.reloadOnSearch = false;
        });

        describe('and the path is the same', function () {
          describe('and the search params are the same', function () {
            it('returns true', function () {
              expect(kbnUrl._shouldForceReload(next, prev, $route)).to.be(true);
            });
          });
          describe('but the search params are different', function () {
            it('returns true', function () {
              next.search = {};
              prev.search = { q: 'search term' };
              expect(kbnUrl._shouldForceReload(next, prev, $route)).to.be(true);
            });
          });
        });

        describe('and the path is different', function () {
          beforeEach(function () {
            next.path = '/not-same';
          });

          describe('and the search params are the same', function () {
            it('returns false', function () {
              expect(kbnUrl._shouldForceReload(next, prev, $route)).to.be(false);
            });
          });
          describe('but the search params are different', function () {
            it('returns false', function () {
              next.search = {};
              prev.search = { q: 'search term' };
              expect(kbnUrl._shouldForceReload(next, prev, $route)).to.be(false);
            });
          });
        });
      });
    });
  });
});
