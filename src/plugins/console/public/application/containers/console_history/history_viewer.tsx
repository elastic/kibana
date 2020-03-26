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

import React, { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import { DevToolsSettings } from '../../../services';
import { subscribeResizeChecker } from '../editor/legacy/subscribe_console_resize_checker';

// @ts-ignore
import * as InputMode from '../../models/legacy_core_editor/mode/input';
const inputMode = new InputMode.Mode();
import * as editor from '../../models/legacy_core_editor';
import { applyCurrentSettings } from '../editor/legacy/console_editor/apply_editor_settings';

interface Props {
  settings: DevToolsSettings;
  req: any | null;
}

export function HistoryViewer({ settings, req }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<editor.CustomAceEditor | null>(null);

  useEffect(() => {
    const viewer = editor.createReadOnlyAceEditor(divRef.current!);
    viewerRef.current = viewer;
    const unsubscribe = subscribeResizeChecker(divRef.current!, viewer);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    applyCurrentSettings(viewerRef.current!, settings);
  }, [settings]);

  if (viewerRef.current) {
    const { current: viewer } = viewerRef;
    if (req) {
      const s = req.method + ' ' + req.endpoint + '\n' + (req.data || '');
      viewer.update(s, inputMode);
      viewer.clearSelection();
    } else {
      viewer.update(
        i18n.translate('console.historyPage.noHistoryTextMessage', {
          defaultMessage: 'No history available',
        }),
        inputMode
      );
    }
  }

  return <div className="conHistory__viewer" ref={divRef} />;
}
