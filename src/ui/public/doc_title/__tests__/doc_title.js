import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { DocTitleProvider } from 'ui/doc_title';

describe('docTitle Service', function () {
  let initialDocTitle;
  const MAIN_TITLE = 'Kibana 4';

  let docTitle;
  let $rootScope;

  beforeEach(function () {
    initialDocTitle = document.title;
    document.title = MAIN_TITLE;
  });
  afterEach(function () {
    document.title = initialDocTitle;
  });

  beforeEach(ngMock.module('kibana', function ($provide) {
    $provide.decorator('docTitle', decorateWithSpy('update'));
    $provide.decorator('$rootScope', decorateWithSpy('$on'));
  }));

  beforeEach(ngMock.inject(function ($injector, Private) {
    if (_.random(0, 1)) {
      docTitle = $injector.get('docTitle');
    } else {
      docTitle = Private(DocTitleProvider);
    }

    $rootScope = $injector.get('$rootScope');
  }));

  describe('setup', function () {
    it('resets the title when a route change begins', function () {
      const spy = $rootScope.$on;

      const found = spy.args.some(function (args) {
        return args[0] === '$routeChangeStart' && args[1] === docTitle.reset;
      });

      if (!found) {
        throw new Error('$rootScope.$on not called');
      }
    });
  });

  describe('#reset', function () {
    it('clears the internal state, next update() will write the default', function () {
      docTitle.change('some title');
      docTitle.update();
      expect(document.title).to.be('some title - ' + MAIN_TITLE);

      docTitle.reset();
      docTitle.update();
      expect(document.title).to.be(MAIN_TITLE);
    });
  });

  describe('#change', function () {
    it('writes the first param to as the first part of the doc name', function () {
      expect(document.title).to.be(MAIN_TITLE);
      docTitle.change('some secondary title');
      expect(document.title).to.be('some secondary title - ' + MAIN_TITLE);
    });

    it('will write just the first param if the second param is true', function () {
      expect(document.title).to.be(MAIN_TITLE);
      docTitle.change('entire name', true);
      expect(document.title).to.be('entire name');
    });
  });

  function decorateWithSpy(prop) {
    return function ($delegate) {
      sinon.spy($delegate, prop);
      return $delegate;
    };
  }

});
