/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { memoize } from 'lodash';
import { css } from '@emotion/react';
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
  EuiSplitPanel,
  EuiButtonEmpty,
  EuiFormFieldset,
  EuiCheckableCard,
  EuiResizableContainer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { HistoryEmptyPrompt } from './history_empty';
import { useServicesContext } from '../../contexts';
import { useEditorActionContext } from '../../contexts/editor_context';
import { HistoryViewer } from './history_viewer_monaco';
import { useEditorReadContext } from '../../contexts/editor_context';
import { getFormattedRequest } from '../../lib';
import { ESRequest, RestoreMethod } from '../../../types';

const CHILD_ELEMENT_PREFIX = 'historyReq';

const CheckeableCardLabel = ({
  endpoint,
  formattedDate,
}: {
  endpoint: string;
  formattedDate: string;
}) => (
  <EuiFlexGroup>
    <EuiFlexItem>
      <EuiText size="s">
        <b>{endpoint}</b>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        {formattedDate}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export function History() {
  const { euiTheme } = useEuiTheme();
  const {
    services: { history },
  } = useServicesContext();
  const dispatch = useEditorActionContext();

  const { settings: readOnlySettings } = useEditorReadContext();

  const [requests, setPastRequests] = useState<any[]>(history.getHistory());

  const clearHistory = useCallback(() => {
    history.clearHistory();
    setPastRequests(history.getHistory());
  }, [history]);

  const [viewingReq, setViewingReq] = useState<any>(null);

  const describeReq = useMemo(() => {
    const _describeReq = (req: { endpoint: string; time: string }) => {
      const endpoint = req.endpoint;
      const date = moment(req.time);

      let formattedDate = date.format('MMM D');
      if (date.diff(moment(), 'days') > -7) {
        formattedDate = date.fromNow();
      }

      return {
        endpoint,
        formattedDate,
      };
    };

    (_describeReq as any).cache = new WeakMap();

    return memoize(_describeReq);
  }, []);

  const initialize = useCallback(() => {
    const nextSelectedIndex = 0;
    (describeReq as any).cache = new WeakMap();
    setViewingReq(requests[nextSelectedIndex]);
  }, [describeReq, requests]);

  const clear = () => {
    clearHistory();
    initialize();
  };

  const restoreRequestFromHistory = useCallback(
    (restoreMethod: RestoreMethod) => {
      const formattedRequest = getFormattedRequest(viewingReq as ESRequest);

      dispatch({
        type: 'setRequestToRestore',
        payload: {
          request: formattedRequest,
          restoreMethod,
        },
      });
    },
    [viewingReq, dispatch]
  );

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <EuiPanel
      color="subdued"
      paddingSize="none"
      hasShadow={false}
      borderRadius="none"
      css={{ height: '100%' }}
    >
      <EuiResizableContainer style={{ height: '100%' }}>
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              initialSize={50}
              minSize="30%"
              tabIndex={0}
              borderRadius="none"
              hasShadow={false}
            >
              <EuiSplitPanel.Outer
                grow
                color="subdued"
                css={{
                  height: '100%',
                  paddingRight: euiTheme.size.s,
                }}
              >
                <EuiSplitPanel.Inner paddingSize="none">
                  <EuiFlexGroup direction="column" gutterSize="none">
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

                    <EuiFlexItem
                      grow={false}
                      css={{ height: 'calc(100vh - 415px)', overflowY: 'auto' }}
                    >
                      {requests.length === 0 && <HistoryEmptyPrompt />}

                      {requests.map((req, idx) => (
                        <EuiFormFieldset key={idx} data-test-subj="historyItemFieldset">
                          <EuiCheckableCard
                            id={`${CHILD_ELEMENT_PREFIX}${idx}`}
                            label={<CheckeableCardLabel {...describeReq(req)} />}
                            data-test-subj={`historyItem-${idx}`}
                            checkableType="radio"
                            checked={viewingReq === req}
                            onChange={() => {
                              setViewingReq(req);
                            }}
                          />
                          <EuiSpacer size="s" />
                        </EuiFormFieldset>
                      ))}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiSplitPanel.Inner>
                <EuiSplitPanel.Inner grow={false} color="subdued" paddingSize="none">
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

            <EuiResizableButton
              css={css`
                background-color: ${euiTheme.colors.lightestShade};
              `}
            />

            <EuiResizablePanel initialSize={50} minSize="200px" tabIndex={0} paddingSize="none">
              <EuiSplitPanel.Outer
                color="subdued"
                grow
                css={{ height: '100%' }}
                borderRadius="none"
                hasShadow={false}
              >
                <EuiSplitPanel.Inner paddingSize="none">
                  <HistoryViewer settings={readOnlySettings} req={viewingReq} />
                </EuiSplitPanel.Inner>
                <EuiSplitPanel.Inner grow={false}>
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
