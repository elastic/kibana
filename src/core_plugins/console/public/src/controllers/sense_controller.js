import 'ui/doc_title';
import { useResizeCheckerProvider } from '../sense_editor_resize';

const module = require('ui/modules').get('app/sense');

module.run(function (Private, $rootScope) {
  const useResizeChecker = Private(useResizeCheckerProvider);

  module.setupResizeCheckerForRootEditors = ($el, ...editors) => {
    return useResizeChecker($rootScope, $el, ...editors);
  };
});

module.controller('SenseController', function SenseController($scope, docTitle) {

  docTitle.change('Console');

  // require the root app code, which expects to execute once the dom is loaded up
  require('../app');

  const input = require('../input');
  const es = require('../es');

  this.sendSelected = () => {
    input.focus();
    input.sendCurrentRequestToES();
    return false;
  };

  this.autoIndent = (event) => {
    input.autoIndent();
    event.preventDefault();
    input.focus();
  };
});
