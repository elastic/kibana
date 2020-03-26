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

import 'angular-aria';
import { uiModules } from '../modules';

/**
 * This module will take care of attaching appropriate aria tags related to some angular stuff,
 * e.g. it will attach aria-invalid if the model state is set to invalid.
 *
 * You can find more infos in the official documentation: https://docs.angularjs.org/api/ngAria.
 *
 * Three settings are disabled: it won't automatically attach `tabindex`, `role=button` or
 * handling keyboard events for `ngClick` directives. Kibana uses `kbnAccessibleClick` to handle
 * those cases where you need an `ngClick` non button element to have keyboard access.
 */
uiModules.get('kibana', ['ngAria']).config($ariaProvider => {
  $ariaProvider.config({
    bindKeydown: false,
    bindRoleForClick: false,
    tabindex: false,
  });
});
