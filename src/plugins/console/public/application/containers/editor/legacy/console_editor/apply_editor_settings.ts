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

import { DevToolsSettings } from '../../../../../services';
import { CoreEditor } from '../../../../../types';
import { CustomAceEditor } from '../../../../models/legacy_core_editor';

export function applyCurrentSettings(
  editor: CoreEditor | CustomAceEditor,
  settings: DevToolsSettings
) {
  if ((editor as any).setStyles) {
    (editor as CoreEditor).setStyles({
      wrapLines: settings.wrapMode,
      fontSize: settings.fontSize + 'px',
    });
  } else {
    (editor as CustomAceEditor).getSession().setUseWrapMode(settings.wrapMode);
    (editor as CustomAceEditor).container.style.fontSize = settings.fontSize + 'px';
  }
}
