import 'ui/doc_title';
import { useResizeCheckerProvider } from '../sense_editor_resize';
import $ from 'jquery';
import getInput from '../input';
import getOutput from '../output';
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
  $timeout(() => {
    output = getOutput($('#output'));
    input = getInput($('#editor'), $('#editor_actions'), $('#copy_as_curl'), output);
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
