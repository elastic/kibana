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

import React, { useEffect, useRef, useState } from 'react';
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

import { useAppContext } from '../../../../context';
import { HistoryViewer } from './history_viewer';

interface Props {
  close: () => void;
  clearHistory: () => void;
  restoreFromHistory: (req: any) => void;
  requests: any[];
}

const CHILD_ELEMENT_PREFIX = 'historyReq';

export function ConsoleHistory({ close, requests, clearHistory, restoreFromHistory }: Props) {
  const {
    services: { settings },
    ResizeChecker,
  } = useAppContext();

  const listRef = useRef<HTMLUListElement | null>(null);

  const [viewingReq, setViewingReq] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const selectedReq = useRef<any>(null);

  const scrollIntoView = (idx: number) => {
    const activeDescendant = listRef.current!.querySelector(`#${CHILD_ELEMENT_PREFIX}${idx}`);
    if (activeDescendant) {
      activeDescendant.scrollIntoView();
    }
  };

  const [describeReq] = useState(() => {
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
  });

  const initialize = () => {
    const nextSelectedIndex = 0;
    (describeReq as any).cache = new WeakMap();
    setViewingReq(requests[nextSelectedIndex]);
    selectedReq.current = requests[nextSelectedIndex];
    setSelectedIndex(nextSelectedIndex);
    scrollIntoView(nextSelectedIndex);
  };

  const clear = () => {
    clearHistory();
    initialize();
  };

  const restore = (req: any = selectedReq.current) => {
    restoreFromHistory(req);
  };

  useEffect(() => {
    initialize();
  }, [requests]);

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
                restore();
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
                    scrollIntoView(idx);
                  }}
                  role="option"
                  onMouseEnter={() => setViewingReq(req)}
                  onMouseLeave={() => setViewingReq(selectedReq.current)}
                  onDoubleClick={() => restore(req)}
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

          <HistoryViewer settings={settings} req={viewingReq} ResizeChecker={ResizeChecker} />
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
                <EuiButton color="primary" disabled={!selectedReq} onClick={() => restore()}>
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
