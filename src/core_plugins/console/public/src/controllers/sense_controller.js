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
import 'ui/doc_title';
import { useResizeChecker } from '../sense_editor_resize';
import $ from 'jquery';
import { initializeInput } from '../input';
import { initializeOutput } from '../output';
import init from '../app';
import { SenseTopNavController } from './sense_top_nav_controller';
import { getEndpointFromPosition } from '../autocomplete';
import { DOC_LINK_VERSION } from 'ui/documentation_links';
import rison from 'rison-node';
import { toastNotifications } from 'ui/notify';

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
  let input;
  let output;
  $timeout(async () => {
    output = initializeOutput($('#ConAppOutput'));
    input = initializeInput($('#ConAppEditor'), $('#ConAppEditorActions'), $('#ConCopyAsCurl'), output, $scope.openDocumentation);
    let sourceLocation = 'stored';
    let source;
    const urlParams = $location.search();
    if (urlParams.load_from) {
      sourceLocation = 'http';
      source = urlParams.load_from;
    } else if (urlParams.commands) {
      try {
        const commands = rison.decode(urlParams.commands);
        sourceLocation = 'inline';
        source = commands
          .map(({ comments = [], cmd, body }) => {
            const out = [...comments];
            if (cmd) {
              out.push(cmd);
              if (body) {
                out.push(JSON.stringify(body, null, 2));
              }
            }
            return out.join('\n');
          })
          .join('\n');
      } catch (e) {
        toastNotifications.addWarning({
          title: 'Unable to decode search request'
        });
      }
    }
    init(input, output, sourceLocation, source);
    kbnUiAceKeyboardModeService.initialize($scope, $('#ConAppEditor'));
    const session = input.getSession();
    session.getSelection().on('changeCursor', () => {
      $scope.getDocumentation();
    });
    $scope.getDocumentation();
  });
  $scope.getDocumentation = () => {
    input.getRequestsInRange(function (requests) {
      if (!requests || requests.length === 0) {
        $scope.documentation = null;
        $scope.$apply();
        return;
      }
      const position = requests[0].range.end;
      position.column = position.column - 1;
      const endpoint = getEndpointFromPosition(input, position);
      if (endpoint
        && endpoint.documentation
        && endpoint.documentation.indexOf('http') !== -1) {
        $scope.documentation = endpoint.documentation.replace('/master/', `/${DOC_LINK_VERSION}/`);
        $scope.documentation = $scope.documentation.replace('/current/', `/${DOC_LINK_VERSION}/`);
        $scope.$apply();
      } else {
        $scope.documentation = null;
        $scope.$apply();
      }
    });
  };
  $scope.openDocumentation = () => {
    if (!$scope.documentation) {
      return;
    }
    window.open($scope.documentation, '_blank');
  };

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
