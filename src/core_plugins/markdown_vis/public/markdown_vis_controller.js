import _ from 'lodash';
import MarkdownIt from 'markdown-it';
import { uiModules } from 'ui/modules';
import 'angular-sanitize';

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});

const module = uiModules.get('kibana/markdown_vis', ['kibana', 'ngSanitize']);
module.controller('KbnMarkdownVisController', function ($scope) {
  $scope.$watch('renderComplete', function () {
    if ($scope.updateStatus.params && _.get($scope, 'vis.params.markdown', null)) {
      $scope.html = markdownIt.render($scope.vis.params.markdown);
    }
    $scope.renderComplete();
  });
});
