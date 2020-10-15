/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
