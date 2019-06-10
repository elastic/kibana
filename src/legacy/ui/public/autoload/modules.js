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

import 'angular';
import '../chrome';
import '../config';
import '../courier';
import '../es';
import '../notify';
import '../private';
import '../promises';
import '../modals';
import '../state_management/app_state';
import '../state_management/global_state';
import '../storage';
import '../style_compile';
import '../url';
import '../watch_multi';
import '../react_components';
import '../i18n';

import '@elastic/ui-ace';
import { uiModules } from 'ui/modules';
uiModules.get('kibana', ['ui.ace']);
