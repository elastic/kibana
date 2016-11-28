import marked from 'marked';
import uiModules from 'ui/modules';
import 'angular-sanitize';

marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});


const module = uiModules.get('kibana/markdown_vis', ['kibana', 'ngSanitize']);
module.controller('KbnMarkdownVisController', function ($scope, $element) {
  $scope.$watch('vis.params.markdown', function (html) {
    if (html) {
      $scope.html = marked(html);
    }
    $element.trigger('renderComplete');
  });
});
