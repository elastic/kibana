import marked from 'marked';
import uiModules from 'ui/modules';
marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});

const module = uiModules.get('kibana/markdown_vis', ['kibana']);
module.controller('KbnMarkdownVisController', function ($scope, $sce) {
  $scope.$watch('vis.params.markdown', function (html) {
    if (!html) return;
    $scope.html = $sce.trustAsHtml(marked(html));
  });
});
