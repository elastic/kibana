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
import { EuiProgress } from '@elastic/eui';

import { EditorContentSpinner } from '../../components';
import { Panel, PanelsContainer } from '../../../../../kibana_react/public';
import { Editor as EditorUI, EditorOutput } from './legacy/console_editor';
import { StorageKeys } from '../../../services';
import { useEditorReadContext, useServicesContext, useRequestReadContext } from '../../contexts';

const INITIAL_PANEL_WIDTH = 50;
const PANEL_MIN_WIDTH = '100px';

interface Props {
  loading: boolean;
}

export const Editor = memo(({ loading }: Props) => {
  const {
    services: { storage },
  } = useServicesContext();

  const { currentTextObject } = useEditorReadContext();
  const { requestInFlight } = useRequestReadContext();

  const [firstPanelWidth, secondPanelWidth] = storage.get(StorageKeys.WIDTH, [
    INITIAL_PANEL_WIDTH,
    INITIAL_PANEL_WIDTH,
  ]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const onPanelWidthChange = useCallback(
    debounce((widths: number[]) => {
      storage.set(StorageKeys.WIDTH, widths);
    }, 300),
    []
  );

  if (!currentTextObject) return null;

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
          {loading ? (
            <EditorContentSpinner />
          ) : (
            <EditorUI initialTextValue={currentTextObject.text} />
          )}
        </Panel>
        <Panel
          style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
          initialWidth={secondPanelWidth}
        >
          {loading ? <EditorContentSpinner /> : <EditorOutput />}
        </Panel>
      </PanelsContainer>
    </>
  );
});
