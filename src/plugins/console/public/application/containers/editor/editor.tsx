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
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

import { i18n } from '@kbn/i18n';
import { TextObject } from '../../../../common/text_object';

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
  useEditorActionContext,
} from '../../contexts';
import type { SenseEditor } from '../../models';
import { MonacoEditor, MonacoEditorOutput } from './monaco';
import { getResponseWithMostSevereStatusCode } from '../../../lib/utils';

const DEBOUNCE_DELAY = 500;
const INITIAL_PANEL_WIDTH = 50;
const PANEL_MIN_WIDTH = '100px';

interface Props {
  loading: boolean;
  setEditorInstance: (instance: SenseEditor) => void;
}

export const Editor = memo(({ loading, setEditorInstance }: Props) => {
  const {
    services: { storage },
    config: { isMonacoEnabled } = {},
  } = useServicesContext();

  const { currentTextObject } = useEditorReadContext();
  const {
    requestInFlight,
    lastResult: { data: requestData, error: requestError },
  } = useRequestReadContext();

  const dispatch = useRequestActionContext();
  const editorDispatch = useEditorActionContext();

  const [fetchingMappings, setFetchingMappings] = useState(false);

  const [inputEditorValue, setInputEditorValue] = useState<string>(currentTextObject?.text ?? '');

  useEffect(() => {
    const subscription = getAutocompleteInfo().mapping.isLoading$.subscribe(setFetchingMappings);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedUpdateLocalStorageValue = useCallback(
    debounce((textObject: TextObject) => {
      editorDispatch({ type: 'setCurrentTextObject', payload: textObject });
    }, DEBOUNCE_DELAY),
    []
  );

  // Always keep the currentTextObject in sync with the value in the editor
  // to avoid losing the text object when the user navigates away from the shell
  useEffect(() => {
    // Only update when its not empty, this is to avoid setting the currentTextObject
    // to the example text when the user clears the editor.
    if (inputEditorValue !== '') {
      const textObject = {
        ...currentTextObject,
        text: inputEditorValue,
        updatedAt: Date.now(),
      } as TextObject;

      debouncedUpdateLocalStorageValue(textObject);
    }
  }, [inputEditorValue, debouncedUpdateLocalStorageValue]);

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

  const data = getResponseWithMostSevereStatusCode(requestData) ?? requestError;
  const isLoading = loading || requestInFlight;

  if (!currentTextObject) return null;

  return (
    <>
      {fetchingMappings ? (
        <div className="conApp__requestProgressBarContainer">
          <EuiProgress size="xs" color="accent" position="absolute" />
        </div>
      ) : null}
      <PanelsContainer onPanelWidthChange={onPanelWidthChange} resizerClassName="conApp__resizer">
        <Panel
          style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
          initialWidth={firstPanelWidth}
        >
          <EuiSplitPanel.Outer grow={true} borderRadius="none" hasShadow={false}>
            <EuiSplitPanel.Inner paddingSize="none">
              {loading ? (
                <EditorContentSpinner />
              ) : isMonacoEnabled ? (
                <MonacoEditor
                  localStorageValue={currentTextObject.text}
                  value={inputEditorValue}
                  setValue={setInputEditorValue}
                />
              ) : (
                <EditorUI
                  initialTextValue={currentTextObject.text}
                  setEditorInstance={setEditorInstance}
                />
              )}
            </EuiSplitPanel.Inner>

            {!loading && (
              <EuiSplitPanel.Inner
                grow={false}
                paddingSize="s"
                css={{
                  backgroundColor: euiThemeVars.euiFormBackgroundColor,
                }}
              >
                <EuiButtonEmpty
                  size="xs"
                  color="primary"
                  data-test-subj="clearConsoleInput"
                  onClick={() => setInputEditorValue('')}
                >
                  {i18n.translate('console.editor.clearConsoleInputButton', {
                    defaultMessage: 'Clear this input',
                  })}
                </EuiButtonEmpty>
              </EuiSplitPanel.Inner>
            )}
          </EuiSplitPanel.Outer>
        </Panel>
        <Panel
          style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
          initialWidth={secondPanelWidth}
        >
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
                paddingSize="s"
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
                        {i18n.translate('console.editor.clearConsoleOutputButton', {
                          defaultMessage: 'Clear this output',
                        })}
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
        </Panel>
      </PanelsContainer>
    </>
  );
});
