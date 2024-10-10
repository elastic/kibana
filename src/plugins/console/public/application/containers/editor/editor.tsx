/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, memo, useEffect, useState } from 'react';
import { debounce } from 'lodash';
import {
  EuiProgress,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiResizableContainer,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

import { i18n } from '@kbn/i18n';
import { TextObject } from '../../../../common/text_object';

import {
  EditorContentSpinner,
  OutputPanelEmptyState,
  NetworkRequestStatusBar,
} from '../../components';
import { getAutocompleteInfo, StorageKeys } from '../../../services';
import {
  useServicesContext,
  useRequestReadContext,
  useRequestActionContext,
  useEditorActionContext,
  useEditorReadContext,
} from '../../contexts';
import { MonacoEditor } from './monaco_editor';
import { MonacoEditorOutput } from './monaco_editor_output';
import { getResponseWithMostSevereStatusCode } from '../../../lib/utils';

const INITIAL_PANEL_SIZE = 50;
const PANEL_MIN_SIZE = '20%';
const DEBOUNCE_DELAY = 500;

interface Props {
  loading: boolean;
  inputEditorValue: string;
  setInputEditorValue: (value: string) => void;
}

export const Editor = memo(({ loading, inputEditorValue, setInputEditorValue }: Props) => {
  const {
    services: { storage, objectStorageClient },
  } = useServicesContext();

  const { currentTextObject } = useEditorReadContext();

  const {
    requestInFlight,
    lastResult: { data: requestData, error: requestError },
  } = useRequestReadContext();

  const dispatch = useRequestActionContext();
  const editorDispatch = useEditorActionContext();

  const [fetchingAutocompleteEntities, setFetchingAutocompleteEntities] = useState(false);

  useEffect(() => {
    const debouncedSetFechingAutocompleteEntities = debounce(
      setFetchingAutocompleteEntities,
      DEBOUNCE_DELAY
    );
    const subscription = getAutocompleteInfo().isLoading$.subscribe(
      debouncedSetFechingAutocompleteEntities
    );

    return () => {
      subscription.unsubscribe();
      debouncedSetFechingAutocompleteEntities.cancel();
    };
  }, []);

  const [firstPanelSize, secondPanelSize] = storage.get(StorageKeys.SIZE, [
    INITIAL_PANEL_SIZE,
    INITIAL_PANEL_SIZE,
  ]);

  const isVerticalLayout = useIsWithinBreakpoints(['xs', 's', 'm']);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const onPanelSizeChange = useCallback(
    debounce((sizes) => {
      storage.set(StorageKeys.SIZE, Object.values(sizes));
    }, 300),
    []
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedUpdateLocalStorageValue = useCallback(
    debounce((newValue: string | undefined) => {
      const textObject = {
        ...currentTextObject,
        text: newValue,
        updatedAt: Date.now(),
      } as TextObject;

      objectStorageClient.text.update(textObject);

      editorDispatch({
        type: 'setCurrentTextObject',
        payload: textObject,
      });
    }, DEBOUNCE_DELAY),
    []
  );

  // Always keep the localstorage value in sync with the value in the editor
  // to avoid losing the text object when the user navigates away from the shell
  useEffect(() => {
    debouncedUpdateLocalStorageValue(inputEditorValue);
  }, [debouncedUpdateLocalStorageValue, inputEditorValue]);

  if (!currentTextObject) return null;

  const data = getResponseWithMostSevereStatusCode(requestData) ?? requestError;
  const isLoading = loading || requestInFlight;

  return (
    <>
      {fetchingAutocompleteEntities ? (
        <div className="conApp__requestProgressBarContainer">
          <EuiProgress size="xs" color="accent" position="absolute" />
        </div>
      ) : null}
      <EuiResizableContainer
        style={{ height: '100%' }}
        direction={isVerticalLayout ? 'vertical' : 'horizontal'}
        onPanelWidthChange={(sizes) => onPanelSizeChange(sizes)}
        data-test-subj="consoleEditorContainer"
      >
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              initialSize={firstPanelSize}
              minSize={PANEL_MIN_SIZE}
              tabIndex={0}
              paddingSize="none"
            >
              <EuiSplitPanel.Outer
                grow={true}
                borderRadius="none"
                hasShadow={false}
                style={{ height: '100%' }}
              >
                <EuiSplitPanel.Inner
                  paddingSize="none"
                  grow={true}
                  className="consoleEditorPanel"
                  style={{ top: 0, height: 'calc(100% - 40px)' }}
                >
                  {loading ? (
                    <EditorContentSpinner />
                  ) : (
                    <MonacoEditor
                      localStorageValue={currentTextObject.text}
                      value={inputEditorValue}
                      setValue={setInputEditorValue}
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
                    className="consoleEditorPanel"
                  >
                    <EuiButtonEmpty
                      size="xs"
                      color="primary"
                      data-test-subj="clearConsoleInput"
                      onClick={() => {
                        setInputEditorValue('');
                      }}
                    >
                      {i18n.translate('console.editor.clearConsoleInputButton', {
                        defaultMessage: 'Clear this input',
                      })}
                    </EuiButtonEmpty>
                  </EuiSplitPanel.Inner>
                )}
              </EuiSplitPanel.Outer>
            </EuiResizablePanel>

            <EuiResizableButton
              className="conApp__resizerButton"
              aria-label={i18n.translate('console.editor.adjustPanelSizeAriaLabel', {
                defaultMessage: "Press left/right to adjust panels' sizes",
              })}
            />

            <EuiResizablePanel
              initialSize={secondPanelSize}
              minSize={PANEL_MIN_SIZE}
              tabIndex={0}
              paddingSize="none"
            >
              <EuiSplitPanel.Outer borderRadius="none" hasShadow={false} style={{ height: '100%' }}>
                <EuiSplitPanel.Inner
                  paddingSize="none"
                  css={{ alignContent: 'center', top: 0 }}
                  className="consoleEditorPanel"
                >
                  {data ? (
                    <MonacoEditorOutput />
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
                    className="consoleEditorPanel"
                  >
                    <EuiFlexGroup gutterSize="none" responsive={false}>
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
