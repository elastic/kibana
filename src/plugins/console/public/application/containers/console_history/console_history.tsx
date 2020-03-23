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

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { memoize } from 'lodash';
import moment from 'moment';
import {
  keyCodes,
  EuiSpacer,
  EuiIcon,
  EuiTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';

import { useServicesContext } from '../../contexts';
import { HistoryViewer } from './history_viewer';
import { useEditorReadContext } from '../../contexts/editor_context';
import { useRestoreRequestFromHistory } from '../../hooks';

interface Props {
  close: () => void;
}

const CHILD_ELEMENT_PREFIX = 'historyReq';

export function ConsoleHistory({ close }: Props) {
  const {
    services: { history },
  } = useServicesContext();

  const { settings: readOnlySettings } = useEditorReadContext();

  const [requests, setPastRequests] = useState<any[]>(history.getHistory());

  const clearHistory = useCallback(() => {
    history.clearHistory();
    setPastRequests(history.getHistory());
  }, [history]);

  const listRef = useRef<HTMLUListElement | null>(null);

  const [viewingReq, setViewingReq] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const selectedReq = useRef<any>(null);

  const describeReq = useMemo(() => {
    const _describeReq = (req: any) => {
      const endpoint = req.endpoint;
      const date = moment(req.time);

      let formattedDate = date.format('MMM D');
      if (date.diff(moment(), 'days') > -7) {
        formattedDate = date.fromNow();
      }

      return `${endpoint} (${formattedDate})`;
    };

    (_describeReq as any).cache = new WeakMap();

    return memoize(_describeReq);
  }, []);

  const scrollIntoView = useCallback((idx: number) => {
    const activeDescendant = listRef.current!.querySelector(`#${CHILD_ELEMENT_PREFIX}${idx}`);
    if (activeDescendant) {
      activeDescendant.scrollIntoView();
    }
  }, []);

  const initialize = useCallback(() => {
    const nextSelectedIndex = 0;
    (describeReq as any).cache = new WeakMap();
    setViewingReq(requests[nextSelectedIndex]);
    selectedReq.current = requests[nextSelectedIndex];
    setSelectedIndex(nextSelectedIndex);
    scrollIntoView(nextSelectedIndex);
  }, [describeReq, requests, scrollIntoView]);

  const clear = () => {
    clearHistory();
    initialize();
  };

  const restoreRequestFromHistory = useRestoreRequestFromHistory();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const done = history.change(setPastRequests);
    return () => done();
  }, [history]);

  /* eslint-disable */
  return (
    <>
      <div className="conHistory">
        <EuiTitle size="s">
          <h2>{i18n.translate('console.historyPage.pageTitle', { defaultMessage: 'History' })}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <div className="conHistory__body">
          <ul
            ref={listRef}
            onKeyDown={(ev: React.KeyboardEvent) => {
              if (ev.keyCode === keyCodes.ENTER) {
                restoreRequestFromHistory(selectedReq.current);
                return;
              }

              let currentIdx = selectedIndex;

              if (ev.keyCode === keyCodes.UP) {
                ev.preventDefault();
                --currentIdx;
              } else if (ev.keyCode === keyCodes.DOWN) {
                ev.preventDefault();
                ++currentIdx;
              }

              const nextSelectedIndex = Math.min(Math.max(0, currentIdx), requests.length - 1);

              setViewingReq(requests[nextSelectedIndex]);
              selectedReq.current = requests[nextSelectedIndex];
              setSelectedIndex(nextSelectedIndex);
              scrollIntoView(nextSelectedIndex);
            }}
            role="listbox"
            className="list-group conHistory__reqs"
            tabIndex={0}
            aria-activedescendant={`${CHILD_ELEMENT_PREFIX}${selectedIndex}`}
            aria-label={i18n.translate('console.historyPage.requestListAriaLabel', {
              defaultMessage: 'History of sent requests',
            })}
          >
            {requests.map((req, idx) => {
              const reqDescription = describeReq(req);
              const isSelected = viewingReq === req;
              return (
                // Ignore a11y issues on li's
                // eslint-disable-next-line
                <li
                  key={idx}
                  id={`${CHILD_ELEMENT_PREFIX}${idx}`}
                  className={`list-group-item conHistory__req ${
                    isSelected ? 'conHistory__req-selected' : ''
                  }`}
                  onClick={() => {
                    setViewingReq(req);
                    selectedReq.current = req;
                    setSelectedIndex(idx);
                  }}
                  role="option"
                  onMouseEnter={() => setViewingReq(req)}
                  onMouseLeave={() => setViewingReq(selectedReq.current)}
                  onDoubleClick={() => restoreRequestFromHistory(selectedReq.current)}
                  aria-label={i18n.translate('console.historyPage.itemOfRequestListAriaLabel', {
                    defaultMessage: 'Request: {historyItem}',
                    values: { historyItem: reqDescription },
                  })}
                  aria-selected={isSelected}
                >
                  {reqDescription}
                  <span className="conHistory__reqIcon">
                    <EuiIcon type="arrowRight" />
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="conHistory__body__spacer" />

          <HistoryViewer settings={readOnlySettings} req={viewingReq} />
        </div>

        <EuiSpacer size="s" />

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="danger" onClick={() => clear()}>
              {i18n.translate('console.historyPage.clearHistoryButtonLabel', {
                defaultMessage: 'Clear',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty color="primary" onClick={() => close()}>
                  {i18n.translate('console.historyPage.closehistoryButtonLabel', {
                    defaultMessage: 'Close',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  disabled={!selectedReq}
                  onClick={() => restoreRequestFromHistory(selectedReq.current)}
                >
                  {i18n.translate('console.historyPage.applyHistoryButtonLabel', {
                    defaultMessage: 'Apply',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <EuiSpacer size="s" />
    </>
  );
}
