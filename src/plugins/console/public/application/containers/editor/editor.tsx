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

import React, { useCallback, memo, useState, useEffect } from 'react';
import { debounce } from 'lodash';
import { EuiProgress, EuiControlBar, EuiLoadingSpinner } from '@elastic/eui';

import { Panel, PanelsContainer } from '../../../../../kibana_react/public';
import { Editor as EditorUI, EditorOutput } from './legacy/console_editor';
import { StorageKeys } from '../../../services';
import {
  useServicesContext,
  useRequestReadContext,
  useTextObjectsReadContext,
} from '../../contexts';

import { addDefaultValues } from '../file_tree/file_tree';
import { NetworkRequestStatusBar, FileSaveErrorIcon, FileSavedIcon } from '../../components';

const INITIAL_PANEL_WIDTH = 50;
const PANEL_MIN_WIDTH = '100px';

const DEFAULT_INPUT_VALUE = `GET _search
{
  "query": {
    "match_all": {}
  }
}`;

export const Editor = memo(() => {
  const {
    services: { storage, objectStorageClient },
  } = useServicesContext();

  const [initialTextValue, setInitialTextValue] = useState<string | undefined>();

  const {
    textObjects,
    currentTextObjectId,
    persistingTextObjectWithId,
    textObjectsSaveError,
  } = useTextObjectsReadContext();

  const {
    requestInFlight,
    lastResult: { data: requestData, error: requestError },
  } = useRequestReadContext();
  const lastDatum = requestData?.[requestData.length - 1] ?? requestError;

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

  useEffect(() => {
    setInitialTextValue(undefined);
    if (currentTextObjectId) {
      objectStorageClient.text
        .get(currentTextObjectId, ['text'])
        .then(({ text }) => setInitialTextValue(text ?? DEFAULT_INPUT_VALUE));
    }
  }, [currentTextObjectId, objectStorageClient]);

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
          {currentTextObject && initialTextValue != null && (
            <>
              <EditorUI textObject={{ ...currentTextObject, text: initialTextValue }} />
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
                    text: (
                      <div className="conApp__controlBar__saveSpinner">
                        {persistingTextObjectWithId === currentTextObjectId ? (
                          <EuiLoadingSpinner size="m" />
                        ) : textObjectsSaveError[currentTextObjectId] ? (
                          <FileSaveErrorIcon
                            errorMessage={textObjectsSaveError[currentTextObjectId]}
                          />
                        ) : (
                          <FileSavedIcon />
                        )}
                      </div>
                    ),
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
          <>
            <EditorOutput />
            <EuiControlBar
              size="s"
              position="absolute"
              controls={[
                {
                  controlType: 'spacer',
                },
                {
                  controlType: 'text',
                  id: 'saving_status',
                  text: (
                    <NetworkRequestStatusBar
                      className="conApp__networkRequestBar"
                      requestInProgress={requestInFlight}
                      requestResult={
                        lastDatum
                          ? {
                              method: lastDatum.request.method.toUpperCase(),
                              endpoint: lastDatum.request.path,
                              statusCode: lastDatum.response.statusCode,
                              statusText: lastDatum.response.statusText,
                              timeElapsedMs: lastDatum.response.timeMs,
                            }
                          : undefined
                      }
                    />
                  ),
                },
              ]}
            />
          </>
        </Panel>
      </PanelsContainer>
    </>
  );
});
