/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import saveTemplate from '../partials/save_sheet.html';

export function initTimelionSaveSheetDirective(app) {
  app.directive('timelionSave', function () {
    return {
      replace: true,
      restrict: 'E',
      template: saveTemplate,
    };
  });
}
