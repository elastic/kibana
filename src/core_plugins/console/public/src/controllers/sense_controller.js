import 'ui/doc_title';
import { useResizeChecker } from '../sense_editor_resize';
import $ from 'jquery';
import { initializeInput } from '../input';
import { initializeOutput } from '../output';
import init from '../app';
import { SenseTopNavController } from './sense_top_nav_controller';
import history from '../history';

const module = require('ui/modules').get('app/sense');

module.run(function (Private, $rootScope) {
  module.setupResizeCheckerForRootEditors = ($el, ...editors) => {
    return useResizeChecker($rootScope, $el, ...editors);
  };
});

module.controller('SenseController', function SenseController(Private, $scope, $timeout, $location, docTitle, kbnUiAceKeyboardModeService) {
  docTitle.change('Console');

  $scope.topNavController = Private(SenseTopNavController);

  // We need to wait for these elements to be rendered before we can select them with jQuery
  // and then initialize this app
  let input, output, app;
  $timeout(() => {
    output = initializeOutput($('#output'));
    input = initializeInput($('#editor'), $('#editor_actions'), $('#copy_as_curl'), output);
    app = init(input, output, $location.search().load_from);
    kbnUiAceKeyboardModeService.initialize($scope, $('#editor'));
  });

  function loadWorkspaces() {
    return history.getWorkspaceIds();
  }

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

  $scope.activeWorkspace = null;
  $scope.newWorkspaceName = null;
  $scope.workspaces = loadWorkspaces() || [];

  $scope.onCancelNewWorkspace = function () {
    $timeout(() => {
      const workspace = null;
      this.activeWorkspace = workspace;
      $scope.$apply();
    }, 0);
  }

  $scope.onCreateNewWorkspace = function () {
    const newWorkspace = this.newWorkspaceName;
    let workspaceIds = this.workspaces;
    this.activeWorkspace = newWorkspace;

    if (!workspaceIds.some(id => id === newWorkspace)) {
      workspaceIds.push(newWorkspace);
      workspaceIds = workspaceIds.sort();
    }
    app.changeWorkspace(newWorkspace);

    $timeout(() => {
      $scope.$apply();
    }, 0);
  }

  $scope.onWorkspaceChange = function () {
    const workspace = this.activeWorkspace;
    if (workspace === "-1") {
      return;
    }
    app.changeWorkspace(workspace);
  }

  $scope.removeWorkspace = function () {
    let workspaceIds = this.workspaces;
    const workspaceToDelete = this.activeWorkspace;
    const i = workspaceIds.indexOf(workspaceToDelete);
    if (i == -1)
      return;

    workspaceIds.splice(i, 1);

    $timeout(() => {
      const workspace = null;
      this.activeWorkspace = workspace;
      app.changeWorkspace(workspace);
      history.deleteWorkspace(workspaceToDelete);
      $scope.$apply();
    }, 0);
  }
});
