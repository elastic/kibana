/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { TimelionHelpTabs } from './timelionhelp_tabs';

export function initTimelionTabsDirective(app, deps) {
  app.directive('timelionHelpTabs', function (reactDirective) {
    return reactDirective(
      (props) => {
        return (
          <deps.core.i18n.Context>
            <TimelionHelpTabs {...props} />
          </deps.core.i18n.Context>
        );
      },
      [['activeTab'], ['activateTab', { watchDepth: 'reference' }]],
      {
        restrict: 'E',
        scope: {
          activeTab: '=',
          activateTab: '=',
        },
      }
    );
  });
}
