import 'ui/doc_title';
import { useResizeCheckerProvider } from '../sense_editor_resize';
import $ from 'jquery';
import { initializeInput } from '../input';
import { initializeOutput } from '../output';
import init from '../app';
import { SenseTopNavController } from './sense_top_nav_controller';

const module = require('ui/modules').get('app/sense');

module.run(function (Private, $rootScope) {
  const useResizeChecker = Private(useResizeCheckerProvider);

  module.setupResizeCheckerForRootEditors = ($el, ...editors) => {
    return useResizeChecker($rootScope, $el, ...editors);
  };
});

module.controller('SenseController', function SenseController(Private, $scope, $timeout, $location, docTitle) {
  docTitle.change('Console');

  $scope.topNavController = Private(SenseTopNavController);

  // We need to wait for these elements to be rendered before we can select them with jQuery
  // and then initialize this app
  let input, output;
  $timeout(() => {
    output = initializeOutput($('#output'));
    input = initializeInput($('#editor'), $('#editor_actions'), $('#copy_as_curl'), output);
    init(input, output, $location.search().load_from);
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
