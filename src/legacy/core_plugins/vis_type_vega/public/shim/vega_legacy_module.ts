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

import 'ngreact';
import 'brace/mode/hjson';
import 'brace/ext/searchbox';
import 'ui/accessibility/kbn_ui_ace_keyboard_mode';
import 'ui/vis/map/service_settings';

import { once } from 'lodash';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { wrapInI18nContext } from 'ui/i18n';

// @ts-ignore
import { VegaEditorController } from '../vega_editor_controller';
// @ts-ignore
import { VegaHelpMenu } from '../help_menus/vega_help_menu';
// @ts-ignore
import { VegaActionsMenu } from '../help_menus/vega_action_menu';

/** @internal */
export const initVegaLegacyModule = once((): void => {
  uiModules
    .get('kibana/vega', ['react'])
    .controller('VegaEditorController', VegaEditorController)
    .directive('vegaActionsMenu', (reactDirective: any) =>
      reactDirective(wrapInI18nContext(VegaActionsMenu))
    )
    .directive('vegaHelpMenu', (reactDirective: any) =>
      reactDirective(wrapInI18nContext(VegaHelpMenu))
    );
});
