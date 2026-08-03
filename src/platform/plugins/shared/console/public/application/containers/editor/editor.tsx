/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, memo, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { debounce } from 'lodash';
import {
  EuiProgress,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiResizableContainer,
  useIsWithinBreakpoints,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { TextObject } from '../../../../common/text_object';

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
import { consoleEditorPanelStyles, useResizerButtonStyles } from '../styles';

const INITIAL_PANEL_SIZE = 50;
const PANEL_MIN_SIZE = '20%';
const DEBOUNCE_DELAY = 500;

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    consoleEditorPanel: consoleEditorPanelStyles,

    requestProgressBarContainer: css`
      position: relative;
      z-index: ${euiTheme.levels.menu};
    `,

    resizerButton: useResizerButtonStyles(),

    // Consolidated styles for editor panels with positioning
    editorPanelPositioned: css`
      top: 0;
      height: calc(100% - 40px);
    `,

    outputPanelCentered: css`
      align-content: center;
      top: 0;
      height: calc(100% - 40px);
    `,

    actionsPanelWithBackground: css`
      background-color: ${euiTheme.colors.backgroundBasePlain};
    `,

    fullHeightPanel: css`
      height: 100%;
    `,
  };
};

interface Props {
  loading: boolean;
  inputEditorValue: string;
  setInputEditorValue: (value: string) => void;
}

export const Editor = memo(({ loading, inputEditorValue, setInputEditorValue }: Props) => {
  const {
    services: { storage, objectStorageClient },
  } = useServicesContext();
  const styles = useStyles();

  const { currentTextObject, customParsedRequestsProvider } = useEditorReadContext();

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
        <div css={styles.requestProgressBarContainer}>
          <EuiProgress size="xs" color="accent" position="absolute" />
        </div>
      ) : null}
      <EuiResizableContainer
        css={styles.fullHeightPanel}
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
                css={styles.fullHeightPanel}
              >
                <EuiSplitPanel.Inner
                  paddingSize="none"
                  grow={true}
                  css={[styles.consoleEditorPanel, styles.editorPanelPositioned]}
                >
                  {loading ? (
                    <EditorContentSpinner />
                  ) : (
                    <MonacoEditor
                      localStorageValue={currentTextObject.text}
                      value={inputEditorValue}
                      setValue={setInputEditorValue}
                      customParsedRequestsProvider={customParsedRequestsProvider}
                    />
                  )}
                </EuiSplitPanel.Inner>

                {!loading && (
                  <EuiSplitPanel.Inner
                    grow={false}
                    paddingSize="s"
                    color="subdued"
                    css={styles.consoleEditorPanel}
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
              css={styles.resizerButton}
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
              <EuiSplitPanel.Outer
                borderRadius="none"
                hasShadow={false}
                css={styles.fullHeightPanel}
              >
                <EuiSplitPanel.Inner
                  paddingSize="none"
                  css={[styles.consoleEditorPanel, styles.outputPanelCentered]}
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
                    css={[styles.consoleEditorPanel, styles.actionsPanelWithBackground]}
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
