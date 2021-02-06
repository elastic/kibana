/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import saveObjectSaveAsCheckboxTemplate from './saved_object_save_as_checkbox.html';

export function initSavedObjectSaveAsCheckBoxDirective(app) {
  app.directive('savedObjectSaveAsCheckBox', function () {
    return {
      restrict: 'E',
      template: saveObjectSaveAsCheckboxTemplate,
      replace: true,
      scope: {
        savedObject: '=',
      },
    };
  });
}
