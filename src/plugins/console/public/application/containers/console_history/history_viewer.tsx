/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import { DevToolsSettings } from '../../../services';
import { subscribeResizeChecker } from '../editor/legacy/subscribe_console_resize_checker';

import * as InputMode from '../../models/legacy_core_editor/mode/input';
const inputMode = new InputMode.Mode();
import * as editor from '../../models/legacy_core_editor';
import { applyCurrentSettings } from '../editor/legacy/console_editor/apply_editor_settings';
import { formatRequestBodyDoc } from '../../../lib/utils';

interface Props {
  settings: DevToolsSettings;
  req: { method: string; endpoint: string; data: string; time: string } | null;
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
      const indent = true;
      const formattedData = req.data ? formatRequestBodyDoc([req.data], indent).data : '';
      const s = req.method + ' ' + req.endpoint + '\n' + formattedData;
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
