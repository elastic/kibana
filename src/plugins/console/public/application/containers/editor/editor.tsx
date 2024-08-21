/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, memo, useEffect, useState } from 'react';
import { debounce } from 'lodash';
import { EuiProgress, EuiTourStep } from '@elastic/eui';

import { EditorContentSpinner } from '../../components';
import { Panel, PanelsContainer } from '..';
import { Editor as EditorUI, EditorOutput } from './legacy/console_editor';
import { getAutocompleteInfo, StorageKeys } from '../../../services';
import { useEditorReadContext, useServicesContext, useRequestReadContext } from '../../contexts';
import type { SenseEditor } from '../../models';
import { MonacoEditor, MonacoEditorOutput } from './monaco';

const INITIAL_PANEL_WIDTH = 50;
const PANEL_MIN_WIDTH = '100px';

interface Props {
  loading: boolean;
  setEditorInstance: (instance: SenseEditor) => void;
  tourStepProps: EuiTourStepProps;
}

export const Editor = memo(({ loading, setEditorInstance, tourStepProps }: Props) => {
  const {
    services: { storage },
    config: { isMonacoEnabled } = {},
  } = useServicesContext();

  const { currentTextObject } = useEditorReadContext();
  const { requestInFlight } = useRequestReadContext();

  const [fetchingMappings, setFetchingMappings] = useState(false);

  useEffect(() => {
    const subscription = getAutocompleteInfo().mapping.isLoading$.subscribe(setFetchingMappings);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const { step, isStepOpen, title, onFinish, content, stepsTotal, footerAction } = tourStepProps;

  return (
    <>
      {requestInFlight || fetchingMappings ? (
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
          ) : isMonacoEnabled ? (
            <EuiTourStep
              step={step}
              isStepOpen={isStepOpen}
              title={title}
              content={content}
              stepsTotal={stepsTotal}
              onFinish={onFinish}
              footerAction={footerAction}
            >
              <MonacoEditor initialTextValue={currentTextObject.text} />
            </EuiTourStep>
          ) : (
            <EditorUI
              initialTextValue={currentTextObject.text}
              setEditorInstance={setEditorInstance}
            />
          )}
        </Panel>
        <Panel
          style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
          initialWidth={secondPanelWidth}
        >
          {loading ? (
            <EditorContentSpinner />
          ) : isMonacoEnabled ? (
            <MonacoEditorOutput />
          ) : (
            <EditorOutput />
          )}
        </Panel>
      </PanelsContainer>
    </>
  );
});
