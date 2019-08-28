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

import React, { useCallback, useState } from 'react';
import { debounce } from 'lodash';

import { ConsoleEditor } from './editor';
import { HistoryList } from './history_viewer';

import { useAppContext } from '../context';
import { StorageKeys } from '../services/storage';

const INITIAL_PANEL_WIDTH = 50;

export function Main() {
  const { storage, docLinkVersion } = useAppContext();
  const [, setShowingHistory] = useState(false);
  const [firstPanelWidth, secondPanelWidth] = storage.get(StorageKeys.WIDTH, [
    INITIAL_PANEL_WIDTH,
    INITIAL_PANEL_WIDTH,
  ]);

  const onPanelWidthChange = useCallback(
    debounce(
      (widths: number[]) => {
        storage.set(StorageKeys.WIDTH, widths);
      },
      300,
      { trailing: true }
    ),
    []
  );
  return (
    <>
      <HistoryList close={() => setShowingHistory(false)} />
      <ConsoleEditor
        docLinkVersion={docLinkVersion}
        onPanelWidthChange={onPanelWidthChange}
        initialInputPanelWidth={firstPanelWidth}
        initialOutputPanelWidth={secondPanelWidth}
      />
    </>
  );
}
