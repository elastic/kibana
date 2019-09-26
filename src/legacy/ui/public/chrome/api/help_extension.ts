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

import { npStart } from 'ui/new_platform';
import { ChromeHelpExtension } from '../../../../../core/public';

const newPlatformChrome = npStart.core.chrome;

export type HelpExtensionApi = ReturnType<typeof createHelpExtensionApi>['helpExtension'];
export type HelpExtension = ChromeHelpExtension;

function createHelpExtensionApi() {
  return {
    helpExtension: {
      /**
       * Set the custom help extension, or clear it by passing undefined. This
       * will be rendered within the help popover in the header
       */
      set: (helpExtension: HelpExtension | undefined) => {
        newPlatformChrome.setHelpExtension(helpExtension);
      },

      /**
       * Get the current help extension that should be rendered in the header
       */
      get$: () => newPlatformChrome.getHelpExtension$(),
    },
  };
}

export function initHelpExtensionApi(
  chrome: { [key: string]: any },
  internal: { [key: string]: any }
) {
  const { helpExtension } = createHelpExtensionApi();
  chrome.helpExtension = helpExtension;
}
