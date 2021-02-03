/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

export function initTimelionTopNavDirective(app, deps) {
  app.directive('timelionTopNav', function (reactDirective) {
    return reactDirective(
      (props) => {
        const { TopNavMenu } = deps.plugins.navigation.ui;
        return (
          <deps.core.i18n.Context>
            <TopNavMenu
              appName="timelion"
              showTopNavMenu
              config={props.topNavMenu}
              setMenuMountPoint={deps.mountParams.setHeaderActionMenu}
              onQuerySubmit={props.onTimeUpdate}
              screenTitle="timelion"
              showDatePicker
              showFilterBar={false}
              showQueryInput={false}
              showSaveQuery={false}
              showSearchBar
              useDefaultBehaviors
            />
          </deps.core.i18n.Context>
        );
      },
      [
        ['topNavMenu', { watchDepth: 'reference' }],
        ['onTimeUpdate', { watchDepth: 'reference' }],
      ],
      {
        restrict: 'E',
        scope: {
          topNavMenu: '=',
          onTimeUpdate: '=',
        },
      }
    );
  });
}
