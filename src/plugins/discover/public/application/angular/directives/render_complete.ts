/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IScope } from 'angular';
import { RenderCompleteListener } from '../../../../../kibana_utils/public';

export function createRenderCompleteDirective() {
  return {
    controller($scope: IScope, $element: JQLite) {
      const el = $element[0];
      const renderCompleteListener = new RenderCompleteListener(el);
      $scope.$on('$destroy', renderCompleteListener.destroy);
    },
  };
}
