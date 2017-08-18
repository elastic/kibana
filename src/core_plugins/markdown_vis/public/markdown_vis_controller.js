import MarkdownIt from 'markdown-it';
import { uiModules } from 'ui/modules';
import 'angular-sanitize';

const md = new MarkdownIt();

const module = uiModules.get('kibana/markdown_vis', ['kibana', 'ngSanitize']);
module.controller('KbnMarkdownVisController', function ($scope) {
  $scope.$watch('vis.params.markdown', function (html) {
    if (html) {
      $scope.html = md.render(html);
    }
    $scope.renderComplete();
  });
});
