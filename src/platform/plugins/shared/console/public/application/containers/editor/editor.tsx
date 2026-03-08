/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, memo, useEffect, useState, useRef } from 'react';

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

import { i18n } from '@kbn/i18n';
import type { TextObject } from '../../../../common/text_object';

import { NetworkRequestStatusBar } from '../../components';
import {
  useServicesContext,
  useRequestReadContext,
  useRequestActionContext,
  useEditorActionContext,
  useEditorReadContext,
} from '../../contexts';
import { OutputPanel } from './output_panel';
import { InputPanel } from './input_panel';
import { getResponseWithMostSevereStatusCode } from '../../../lib/utils';
import { useStyles } from './editor_styles';
import { PanelStorage } from './panel_storage';

const PANEL_MIN_SIZE = '20%';
const DEBOUNCE_DELAY = 500;

interface Props {
  loading: boolean;
  inputEditorValue: string;
  setInputEditorValue: (value: string) => void;
}

export const Editor = memo(({ loading, inputEditorValue, setInputEditorValue }: Props) => {
  const {
    services: { objectStorageClient },
  } = useServicesContext();
  const styles = useStyles();
  const panelStorage = useRef(new PanelStorage());
  // only used to hide content
  const { currentTextObject } = useEditorReadContext();

  const {
    requestInFlight,
    lastResult: { data: requestData, error: requestError },
  } = useRequestReadContext();

  // request related
  const dispatch = useRequestActionContext();
  // localStorage related
  const editorDispatch = useEditorActionContext();

  // used for showing a loading state when fetching autocomplete entities
  const [fetchingAutocompleteEntities, setFetchingAutocompleteEntities] = useState(false);

  const [firstPanelSize, secondPanelSize] = panelStorage.current.getPanelSize();

  const isVerticalLayout = useIsWithinBreakpoints(['xs', 's', 'm']);

  // logic should be moved into state update OR into a class
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

  // these could go into a hook
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
        onPanelWidthChange={(sizes) => panelStorage.current.setPanelSize(sizes)}
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
                  <InputPanel
                    loading={loading}
                    inputEditorValue={inputEditorValue}
                    setInputEditorValue={setInputEditorValue}
                    setFetchingAutocompleteEntities={setFetchingAutocompleteEntities}
                  />
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
                  <OutputPanel loading={isLoading} />
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
                        <NetworkRequestStatusBar />
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
