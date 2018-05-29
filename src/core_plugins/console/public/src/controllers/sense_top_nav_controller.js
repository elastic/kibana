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

import { KbnTopNavControllerProvider } from 'ui/kbn_top_nav/kbn_top_nav_controller';
import storage from '../storage';

export function SenseTopNavController(Private) {
  const KbnTopNavController = Private(KbnTopNavControllerProvider);

  const controller = new KbnTopNavController([
    {
      key: 'welcome',
      hideButton: true,
      template: `<sense-welcome></sense-welcome>`,
      testId: 'consoleWelcomeButton',
    },
    {
      key: 'history',
      description: 'History',
      template: `<sense-history></sense-history>`,
      testId: 'consoleHistoryButton',
    },
    {
      key: 'settings',
      description: 'Settings',
      template: `<sense-settings></sense-settings>`,
      testId: 'consoleSettingsButton',
    },
    {
      key: 'help',
      description: 'Help',
      template: `<sense-help></sense-help>`,
      testId: 'consoleHelpButton',
    },
  ]);

  if (storage.get('version_welcome_shown') !== '@@SENSE_REVISION') {
    controller.open('welcome');
  }

  return controller;
}
