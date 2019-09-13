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
import $ from 'jquery';

import { Settings } from '../../../../../services';
import { subscribeResizeChecker } from '../subscribe_console_resize_checker';

// @ts-ignore
import SenseEditor from '../../../../../../../public/quarantined/src/sense_editor/editor';

interface Props {
  settings: Settings;
  req: any | null;
  ResizeChecker: any;
}

export function HistoryViewer({ settings, ResizeChecker, req }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any | null>(null);

  useEffect(() => {
    const viewer = new SenseEditor($(divRef.current!));
    viewerRef.current = viewer;
    viewer.renderer.setShowPrintMargin(false);
    viewer.$blockScrolling = Infinity;
    const unsubscribe = subscribeResizeChecker(ResizeChecker, divRef.current!, viewer);
    settings.applyCurrentSettings(viewer);
    return () => unsubscribe();
  }, []);

  if (viewerRef.current) {
    const { current: viewer } = viewerRef;
    if (req) {
      const s = req.method + ' ' + req.endpoint + '\n' + (req.data || '');
      viewer.setValue(s);
      viewer.clearSelection();
    } else {
      viewer.getSession().setValue(
        i18n.translate('console.historyPage.noHistoryTextMessage', {
          defaultMessage: 'No history available',
        })
      );
    }
  }

  return <div className="conHistory__viewer" ref={divRef} />;
}
