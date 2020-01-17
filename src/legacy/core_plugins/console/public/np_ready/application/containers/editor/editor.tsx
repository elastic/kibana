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

import React, { useCallback } from 'react';
import { debounce } from 'lodash';

import { Panel, PanelsContainer } from '../../components/split_panel';
import { Editor as EditorUI, EditorOutput } from './legacy/console_editor';
import { StorageKeys } from '../../../services';
import { useServicesContext } from '../../contexts';

const INITIAL_PANEL_WIDTH = 50;
const PANEL_MIN_WIDTH = '100px';

export const Editor = () => {
  const {
    services: { storage },
  } = useServicesContext();

  const [firstPanelWidth, secondPanelWidth] = storage.get(StorageKeys.WIDTH, [
    INITIAL_PANEL_WIDTH,
    INITIAL_PANEL_WIDTH,
  ]);

  const onPanelWidthChange = useCallback(
    debounce((widths: number[]) => {
      storage.set(StorageKeys.WIDTH, widths);
    }, 300),
    []
  );

  return (
    <PanelsContainer onPanelWidthChange={onPanelWidthChange} resizerClassName="conApp__resizer">
      <Panel
        style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
        initialWidth={firstPanelWidth}
      >
        <EditorUI />
      </Panel>
      <Panel
        style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
        initialWidth={secondPanelWidth}
      >
        <EditorOutput />
      </Panel>
    </PanelsContainer>
  );
};
