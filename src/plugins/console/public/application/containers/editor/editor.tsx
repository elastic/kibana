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

import React, { useCallback, memo } from 'react';
import { debounce } from 'lodash';
import { EuiProgress, EuiControlBar, EuiText } from '@elastic/eui';

import { Panel, PanelsContainer } from '../../../../../kibana_react/public';
import { Editor as EditorUI, EditorOutput } from './legacy/console_editor';
import { StorageKeys } from '../../../services';
import {
  useServicesContext,
  useRequestReadContext,
  useTextObjectsReadContext,
} from '../../contexts';

import { addDefaultValues } from '../file_tree/file_tree';

const INITIAL_PANEL_WIDTH = 50;
const PANEL_MIN_WIDTH = '100px';

export const Editor = memo(() => {
  const {
    services: { storage },
  } = useServicesContext();

  const { textObjects, currentTextObjectId, saving } = useTextObjectsReadContext();
  const { requestInFlight } = useRequestReadContext();
  const currentTextObject = textObjects[currentTextObjectId];

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
    <>
      {requestInFlight ? (
        <div className="conApp__requestProgressBarContainer">
          <EuiProgress size="xs" color="accent" position="absolute" />
        </div>
      ) : null}
      <PanelsContainer onPanelWidthChange={onPanelWidthChange} resizerClassName="conApp__resizer">
        <Panel
          style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
          initialWidth={firstPanelWidth}
        >
          {currentTextObject && (
            <>
              <EditorUI textObject={currentTextObject} />
              <EuiControlBar
                size="s"
                position="absolute"
                controls={[
                  {
                    iconType: 'document',
                    id: 'root_icon',
                    controlType: 'icon',
                    'aria-label': 'Project Root',
                  },
                  {
                    controlType: 'breadcrumbs',
                    id: 'current_file_path',
                    responsive: true,
                    breadcrumbs: [
                      {
                        text: addDefaultValues([currentTextObject])[0].name,
                      },
                    ],
                  },
                  {
                    controlType: 'spacer',
                  },
                  {
                    controlType: 'text',
                    id: 'saving_status',
                    text: saving ? 'Saving...' : 'Saved.',
                  },
                ]}
              />
            </>
          )}
        </Panel>
        <Panel
          style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
          initialWidth={secondPanelWidth}
        >
          <EditorOutput />
        </Panel>
      </PanelsContainer>
    </>
  );
});
