/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { TimelionDeprecation } from './timelion_deprecation';

export function initTimelionTDeprecationDirective(app, deps) {
  app.directive('timelionDeprecation', function (reactDirective) {
    return reactDirective(
      () => {
        return (
          <deps.core.i18n.Context>
            <TimelionDeprecation links={deps.core.docLinks.links} />
          </deps.core.i18n.Context>
        );
      },
      [],
      {
        restrict: 'E',
        scope: {
          docLinks: '=',
        },
      }
    );
  });
}
