/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FixedSizeList } from 'react-window';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import {
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  useEuiTheme,
  EuiAutoSizer,
  EuiSplitPanel,
  EuiButtonEmpty,
  EuiFormFieldset,
  EuiCheckableCard,
  EuiResizableContainer,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

import { SHELL_TAB_ID } from '../main';
import { HistoryEmptyPrompt } from './history_empty';
import { useServicesContext } from '../../contexts';
import { useEditorActionContext } from '../../contexts/editor_context';
import { HistoryViewer } from './history_viewer_monaco';
import { useEditorReadContext } from '../../contexts/editor_context';
import { getFormattedRequest } from '../../lib';
import type { ESRequest } from '../../../types';
import { RestoreMethod } from '../../../types';
import { consoleEditorPanelStyles, useResizerButtonStyles } from '../styles';

const CHILD_ELEMENT_PREFIX = 'historyReq';

const staticStyles = {
  fullHeight: css`
    height: 100%;
  `,
  // Sticky positioned element
  stickyTopElement: css`
    top: 0;
  `,
};

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    ...staticStyles,
    resizerButton: useResizerButtonStyles(),
    consoleEditorPanel: consoleEditorPanelStyles,

    // Panel with padding and full height
    paddedFullHeightPanel: css`
      height: 100%;
      padding-right: ${euiTheme.size.s};
    `,

    // Content area with top padding
    paddedTopContainer: css`
      padding-top: ${euiTheme.size.l};
    `,
  };
};

interface HistoryProps {
  data: string;
  endpoint: string;
  method: string;
  time: string;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: HistoryProps[];
}

const CheckeableCardLabel = ({ historyItem }: { historyItem: HistoryProps }) => {
  const date = moment(historyItem.time);

  let formattedDate = date.format('MMM D');
  if (date.diff(moment(), 'days') > -7) {
    formattedDate = date.fromNow();
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiText size="s">
          <b>
            {historyItem.method} {historyItem.endpoint}
          </b>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {formattedDate}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function History() {
  const styles = useStyles();
  const {
    services: { history, routeHistory },
  } = useServicesContext();
  const dispatch = useEditorActionContext();

  const { settings: readOnlySettings } = useEditorReadContext();

  const [requests, setPastRequests] = useState<HistoryProps[]>(history.getHistory());

  const clearHistory = useCallback(() => {
    history.clearHistory();
    setPastRequests(history.getHistory());
  }, [history]);

  const [viewingReq, setViewingReq] = useState<any>(null);

  const isVerticalLayout = useIsWithinBreakpoints(['xs', 's', 'm']);

  const initialize = useCallback(() => {
    const nextSelectedIndex = 0;
    setViewingReq(requests[nextSelectedIndex]);
  }, [requests]);

  const clear = () => {
    clearHistory();
    initialize();
  };

  const restoreRequestFromHistory = useCallback(
    (restoreMethod: RestoreMethod) => {
      routeHistory?.push(`/console/${SHELL_TAB_ID}`);

      const formattedRequest = getFormattedRequest(viewingReq as ESRequest);

      dispatch({
        type: 'setRequestToRestore',
        payload: {
          request: formattedRequest,
          restoreMethod,
        },
      });
    },
    [viewingReq, dispatch, routeHistory]
  );

  useEffect(() => {
    initialize();
  }, [initialize]);

  const Row = useCallback(
    ({ data, index, style }: RowProps) => (
      <EuiFormFieldset key={index} data-test-subj="historyItemFieldset" style={style}>
        <EuiCheckableCard
          id={`${CHILD_ELEMENT_PREFIX}${index}`}
          label={<CheckeableCardLabel historyItem={data[index]} />}
          data-test-subj={`historyItem-${index}`}
          checkableType="radio"
          checked={viewingReq === data[index]}
          onChange={() => {
            setViewingReq(data[index]);
          }}
        />
        <EuiSpacer size="s" />
      </EuiFormFieldset>
    ),
    [viewingReq, setViewingReq]
  );

  return (
    <EuiPanel
      color="subdued"
      paddingSize="none"
      hasShadow={false}
      borderRadius="none"
      css={styles.fullHeight}
      data-test-subj="consoleHistoryPanel"
    >
      <EuiResizableContainer
        css={styles.fullHeight}
        direction={isVerticalLayout ? 'vertical' : 'horizontal'}
      >
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              initialSize={50}
              minSize="30%"
              tabIndex={0}
              borderRadius="none"
              hasShadow={false}
              paddingSize="none"
            >
              <EuiSplitPanel.Outer grow color="subdued" css={styles.paddedFullHeightPanel}>
                <EuiSplitPanel.Inner paddingSize="m">
                  <EuiFlexGroup
                    direction="column"
                    gutterSize="none"
                    // column layout with full height
                    css={styles.fullHeight}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiSpacer size="s" />
                      <EuiTitle>
                        <h2>
                          <FormattedMessage
                            id="console.historyPage.pageTitle"
                            defaultMessage="History"
                          />
                        </h2>
                      </EuiTitle>
                      <EuiSpacer size="s" />
                      <EuiText color="subdued">
                        <p>
                          <FormattedMessage
                            id="console.historyPage.pageDescription"
                            defaultMessage="Revisit and reuse your past queries"
                          />
                        </p>
                      </EuiText>
                      <EuiSpacer size="l" />
                    </EuiFlexItem>

                    <EuiFlexItem grow={true} css={styles.fullHeight}>
                      {requests.length === 0 && <HistoryEmptyPrompt />}

                      {requests.length > 0 && (
                        <EuiAutoSizer>
                          {({ height, width }) => (
                            <FixedSizeList
                              height={height}
                              itemCount={requests.length}
                              itemSize={62}
                              itemData={requests}
                              width={width}
                            >
                              {Row}
                            </FixedSizeList>
                          )}
                        </EuiAutoSizer>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiSplitPanel.Inner>
                <EuiSplitPanel.Inner
                  grow={false}
                  color="subdued"
                  paddingSize="s"
                  css={styles.paddedTopContainer}
                >
                  <EuiText>
                    <EuiButtonEmpty
                      size="xs"
                      color="primary"
                      data-test-subj="consoleClearHistoryButton"
                      onClick={clear}
                    >
                      <FormattedMessage
                        id="console.historyPage.clearHistoryButtonLabel"
                        defaultMessage="Clear all history"
                      />
                    </EuiButtonEmpty>
                  </EuiText>
                </EuiSplitPanel.Inner>
              </EuiSplitPanel.Outer>
            </EuiResizablePanel>

            <EuiResizableButton css={styles.resizerButton} />

            <EuiResizablePanel initialSize={50} minSize="15%" tabIndex={0} paddingSize="none">
              <EuiSplitPanel.Outer
                color="subdued"
                css={styles.fullHeight}
                borderRadius="none"
                hasShadow={false}
              >
                <EuiSplitPanel.Inner
                  paddingSize="none"
                  css={[styles.consoleEditorPanel, styles.stickyTopElement]}
                >
                  <HistoryViewer settings={readOnlySettings} req={viewingReq} />
                </EuiSplitPanel.Inner>
                <EuiSplitPanel.Inner grow={false} css={styles.consoleEditorPanel}>
                  <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        data-test-subj="consoleHistoryAddAndRunButton"
                        color="primary"
                        iconType="play"
                        disabled={!viewingReq}
                        onClick={() => restoreRequestFromHistory(RestoreMethod.RESTORE_AND_EXECUTE)}
                      >
                        {i18n.translate('console.historyPage.addAndRunButtonLabel', {
                          defaultMessage: 'Add and run',
                        })}
                      </EuiButton>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiButton
                        data-test-subj="consoleHistoryApplyButton"
                        fill
                        color="primary"
                        iconType="plusInCircle"
                        disabled={!viewingReq}
                        onClick={() => restoreRequestFromHistory(RestoreMethod.RESTORE)}
                      >
                        {i18n.translate('console.historyPage.applyHistoryButtonLabel', {
                          defaultMessage: 'Add',
                        })}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiSplitPanel.Inner>
              </EuiSplitPanel.Outer>
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>
    </EuiPanel>
  );
}
