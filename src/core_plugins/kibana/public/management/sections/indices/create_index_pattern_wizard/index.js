import uiRoutes from 'ui/routes';
import angularTemplate from './angular_template.html';
import 'ui/index_patterns';

import React from 'react';
import { render } from 'react-dom';
import { documentationLinks } from 'ui/documentation_links';
import { CreateIndexPatternWizard } from './create_index_pattern_wizard';

uiRoutes.when('/management/kibana/index', {
  template: angularTemplate,
  controller: function ($scope, $injector) {
    // Wait for the directives to execute
    $scope.$$postDigest(() => {
      const Notifier = $injector.get('Notifier');
      const $routeParams = $injector.get('$routeParams');
      const services = {
        config: $injector.get('config'),
        es: $injector.get('es'),
        indexPatterns: $injector.get('indexPatterns'),
        kbnUrl: $injector.get('kbnUrl'),
        notify: new Notifier(),
      };

      const initialQuery = $routeParams.id ? decodeURIComponent($routeParams.id) : undefined;

      render(
        <CreateIndexPatternWizard
          loadingDataDocUrl={documentationLinks.indexPatterns.loadingData}
          initialQuery={initialQuery}
          services={services}
        />,
        document.getElementById('react')
      );
    });
  }
});
