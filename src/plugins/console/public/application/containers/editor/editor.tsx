/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, memo, useEffect, useState } from 'react';
import { debounce } from 'lodash';
import {
  EuiProgress,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiResizableContainer, useIsWithinMaxBreakpoint
} from "@elastic/eui";
import { euiThemeVars } from '@kbn/ui-theme';

import {
  EditorContentSpinner,
  OutputPanelEmptyState,
  NetworkRequestStatusBar,
} from '../../components';
import { Panel, PanelsContainer } from '..';
import { Editor as EditorUI, EditorOutput } from './legacy/console_editor';
import { getAutocompleteInfo, StorageKeys } from '../../../services';
import {
  useEditorReadContext,
  useServicesContext,
  useRequestReadContext,
  useRequestActionContext,
} from '../../contexts';
import type { SenseEditor } from '../../models';
import { MonacoEditor, MonacoEditorOutput } from './monaco';
import { getResponseWithMostSevereStatusCode } from '../../../lib/utils';

const INITIAL_PANEL_WIDTH = 50;
const PANEL_MIN_SIZE = '200px';

interface Props {
  loading: boolean;
  setEditorInstance: (instance: SenseEditor) => void;
}

export const Editor = memo(({ loading, setEditorInstance }: Props) => {
  const {
    services: { storage },
    config: { isMonacoEnabled } = {},
  } = useServicesContext();

  const isVerticalLayout = useIsWithinMaxBreakpoint('m');

  const { currentTextObject } = useEditorReadContext();
  const {
    requestInFlight,
    lastResult: { data: requestData, error: requestError },
  } = useRequestReadContext();

  const dispatch = useRequestActionContext();

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
  const onPanelSizeChange = useCallback(
    debounce((length: number[], isVertical) => {
      storage.set(isVertical ? StorageKeys.HEIGHT : StorageKeys.WIDTH, widths);
    }, 300),
    []
  );

  const data = getResponseWithMostSevereStatusCode(requestData) ?? requestError;
  const isLoading = loading || requestInFlight;

  if (!currentTextObject) return null;

  return (
    <>
      {requestInFlight || fetchingMappings ? (
        <div className="conApp__requestProgressBarContainer">
          <EuiProgress size="xs" color="accent" position="absolute" />
        </div>
      ) : null}
      <EuiResizableContainer style={{ height: '100%' }} direction={isVerticalLayout ? 'vertical' : 'horizontal'}>
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              initialSize={50}
              minSize={PANEL_MIN_SIZE}
              tabIndex={0}
              style={{ height: '100%' }}
            >
              {loading ? (
                <EditorContentSpinner />
              ) : isMonacoEnabled ? (
                <MonacoEditor initialTextValue={currentTextObject.text} />
              ) : (
                <EditorUI
                  initialTextValue={currentTextObject.text}
                  setEditorInstance={setEditorInstance}
                />
              )}
            </EuiResizablePanel>

            <EuiResizableButton />

            <EuiResizablePanel initialSize={50} minSize={PANEL_MIN_SIZE} tabIndex={0}>
              <EuiSplitPanel.Outer grow borderRadius="none" hasShadow={false}>
                <EuiSplitPanel.Inner paddingSize="none" css={{ alignContent: 'center' }}>
                  {data ? (
                    isMonacoEnabled ? (
                      <MonacoEditorOutput />
                    ) : (
                      <EditorOutput />
                    )
                  ) : isLoading ? (
                    <EditorContentSpinner />
                  ) : (
                    <OutputPanelEmptyState />
                  )}
                </EuiSplitPanel.Inner>

                {(data || isLoading) && (
                  <EuiSplitPanel.Inner
                    grow={false}
                    paddingSize="m"
                    css={{
                      backgroundColor: euiThemeVars.euiFormBackgroundColor,
                    }}
                  >
                    <EuiFlexGroup gutterSize="none">
                      {data ? (
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            size="xs"
                            color="primary"
                            data-test-subj="clearConsoleOutput"
                            onClick={() => dispatch({ type: 'cleanRequest', payload: undefined })}
                          >
                            Clear this output
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                      ) : (
                        <EuiFlexItem grow={false} />
                      )}

                      <EuiFlexItem>
                        <NetworkRequestStatusBar
                          requestInProgress={requestInFlight}
                          requestResult={
                            data
                              ? {
                                  method: data.request.method.toUpperCase(),
                                  endpoint: data.request.path,
                                  statusCode: data.response.statusCode,
                                  statusText: data.response.statusText,
                                  timeElapsedMs: data.response.timeMs,
                                }
                              : undefined
                          }
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiSplitPanel.Inner>
                )}
              </EuiSplitPanel.Outer>
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>
    </>
  );
});
