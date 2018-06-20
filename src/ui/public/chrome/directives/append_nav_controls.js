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

import { chromeNavControlsRegistry } from '../../registry/chrome_nav_controls';
import { uiModules } from '../../modules';

export function kbnAppendChromeNavControls() {

  uiModules
    .get('kibana')
    .directive('kbnChromeAppendNavControls', function (Private) {
      return {
        template: function ($element) {
          const parts = [$element.html()];
          const controls = Private(chromeNavControlsRegistry);

          for (const control of controls.inOrder) {
            parts.unshift(
              `<!-- nav control ${control.name} -->`,
              control.template
            );
          }

          return parts.join('\n');
        }
      };
    });

}
