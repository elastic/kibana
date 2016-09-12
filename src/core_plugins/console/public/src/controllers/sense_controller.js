import 'ui/doc_title';
import { useResizeCheckerProvider } from '../sense_editor_resize';
import $ from 'jquery';
import { initializeInput } from '../input';
import { initializeOutput } from '../output';
import es from '../es';
import init from '../app';

const module = require('ui/modules').get('app/sense');

module.run(function (Private, $rootScope) {
  const useResizeChecker = Private(useResizeCheckerProvider);

  module.setupResizeCheckerForRootEditors = ($el, ...editors) => {
    return useResizeChecker($rootScope, $el, ...editors);
  };
});

module.controller('SenseController', function SenseController($scope, $timeout, docTitle) {

  docTitle.change('Console');

  let input, output;

  // We need to wait for these elements to be rendered before we can select them with jQuery
  // and then initialize this app
  $timeout(() => {
    output = initializeOutput($('#output'));
    input = initializeInput($('#editor'), $('#editor_actions'), $('#copy_as_curl'), output);
    init(input, output);
  });

  $scope.sendSelected = () => {
    input.focus();
    input.sendCurrentRequestToES();
    return false;
  };

  $scope.autoIndent = (event) => {
    input.autoIndent();
    event.preventDefault();
    input.focus();
  };
});
