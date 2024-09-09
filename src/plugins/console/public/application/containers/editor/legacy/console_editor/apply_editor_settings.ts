/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DevToolsSettings } from '../../../../../services';
import { CoreEditor } from '../../../../../types';
import { CustomAceEditor } from '../../../../models/legacy_core_editor';

export function applyCurrentSettings(
  editor: CoreEditor | CustomAceEditor,
  settings: DevToolsSettings
) {
  if ((editor as { setStyles?: Function }).setStyles) {
    (editor as CoreEditor).setStyles({
      wrapLines: settings.wrapMode,
      fontSize: settings.fontSize + 'px',
    });
  } else {
    (editor as CustomAceEditor).getSession().setUseWrapMode(settings.wrapMode);
    (editor as CustomAceEditor).container.style.fontSize = settings.fontSize + 'px';
  }
}
