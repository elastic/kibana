import { SavedObjectsClientProvider } from 'ui/saved_objects';
import uiRoutes from 'ui/routes';
import angularTemplate from './angular_template.html';
import 'ui/index_patterns';
import { documentationLinks } from 'ui/documentation_links';

import { renderCreateIndexPatternWizard, destroyCreateIndexPatternWizard } from './render';

uiRoutes.when('/management/kibana/index', {
  template: angularTemplate,
  controller: function ($scope, $injector) {
    // Wait for the directives to execute
    const kbnUrl = $injector.get('kbnUrl');
    $scope.$$postDigest(() => {
      const $routeParams = $injector.get('$routeParams');
      const services = {
        config: $injector.get('config'),
        es: $injector.get('es'),
        indexPatterns: $injector.get('indexPatterns'),
        savedObjectsClient: $injector.get('Private')(SavedObjectsClientProvider),
        changeUrl: url => {
          $scope.$evalAsync(() => kbnUrl.changePath(url));
        },
      };

      const initialQuery = $routeParams.id ? decodeURIComponent($routeParams.id) : undefined;

      renderCreateIndexPatternWizard(
        documentationLinks.indexPatterns.loadingData,
        initialQuery,
        services
      );
    });

    $scope.$on('$destroy', destroyCreateIndexPatternWizard);
  }
});
