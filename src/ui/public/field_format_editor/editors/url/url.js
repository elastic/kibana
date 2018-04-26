import urlTemplate from './url.html';
import './icons';

export function urlEditor() {
  return {
    formatId: 'url',
    template: urlTemplate,
    controllerAs: 'url',
    controller: function ($scope, chrome) {
      const iconPattern = `${chrome.getBasePath()}/bundles/src/ui/public/field_format_editor/editors/url/icons/{{value}}.png`;

      this.samples = {
        a: [ 'john', '/some/pathname/asset.png', 1234 ],
        img: [ 'go', 'stop', ['de', 'ne', 'us', 'ni'], 'cv' ]
      };

      this.urlTypes = [
        { id: 'a', name: 'Link' },
        { id: 'img', name: 'Image' },
        { id: 'audio', name: 'Audio' }
      ];

      $scope.$watch('editor.formatParams.type', function (type, prev) {
        const params = $scope.editor.formatParams;
        if (type === 'img' && type !== prev && !params.urlTemplate) {
          params.urlTemplate = iconPattern;
        }
      });
    }
  };
}
