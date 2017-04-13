import angular from 'angular';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/private';

import { DocViewsRegistryProvider } from 'ui/registry/doc_views';
import { uiRegistry } from 'ui/registry/_registry';
import 'ui/doc_viewer';

describe('docViewer', function () {
  let stubRegistry;
  let $elem;
  let init;

  beforeEach(function () {
    ngMock.module('kibana', function (PrivateProvider) {
      stubRegistry = uiRegistry({
        index: ['name'],
        order: ['order'],
        constructor() {
          this.forEach(docView => {
            docView.shouldShow = docView.shouldShow || _.constant(true);
            docView.name = docView.name || docView.title;
          });
        }
      });

      PrivateProvider.swap(DocViewsRegistryProvider, stubRegistry);
    });

    // Create the scope
    ngMock.inject(function () {});
  });

  beforeEach(function () {
    $elem = angular.element('<doc-viewer></doc-viewer>');
    init = function init() {
      ngMock.inject(function ($rootScope, $compile) {
        $compile($elem)($rootScope);
        $elem.scope().$digest();
        return $elem;
      });
    };

  });

  describe('injecting views', function () {

    function registerExtension(def = {}) {
      stubRegistry.register(function () {
        return _.defaults(def, {
          title: 'exampleView',
          order: 0,
          directive: {
            template: `Example`
          }
        });
      });
    }
    it('should have a tab for the view', function () {
      registerExtension();
      registerExtension({ title: 'exampleView2' });
      init();
      expect($elem.find('.nav-tabs li').length).to.be(2);
    });

    it('should activate the first view in order', function () {
      registerExtension({ order: 2 });
      registerExtension({ title: 'exampleView2' });
      init();
      expect($elem.find('.nav-tabs .active').text().trim()).to.be('exampleView2');
    });
  });
});
