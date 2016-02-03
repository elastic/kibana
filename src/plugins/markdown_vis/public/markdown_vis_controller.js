import marked from 'marked';
define(function (require) {
  marked.setOptions({
    gfm: true, // Github-flavored markdown
    sanitize: true // Sanitize HTML tags
  });

  const module = require('ui/modules').get('kibana/markdown_vis', ['kibana']);
  module.controller('KbnMarkdownVisController', function ($scope, $sce) {
    $scope.$watch('vis.params.markdown', function (html) {
      if (!html) return;
      $scope.html = $sce.trustAsHtml(marked(html));
    });
  });
});
