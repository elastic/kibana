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
import { keyCodes } from '@elastic/eui';

import { useAppContext } from '../../context';

interface Props {
  close: () => void;
}

export function HistoryList({ close }: Props) {
  const { history } = useAppContext();
  const [reqs, setReqs] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const selectedReq = useRef<any>(null);
  const viewingReq = useRef<any>(null);

  const describeReq = memoize((req: any) => {
    const endpoint = req.endpoint;
    const date = moment(req.time);

    let formattedDate = date.format('MMM D');
    if (date.diff(moment(), 'days') > -7) {
      formattedDate = date.fromNow();
    }

    return `${endpoint} (${formattedDate})`;
  });

  const initialize = () => {
    const nextReqs = history.getHistory();
    const nextSelectedIndex = 0;
    selectedReq.current = viewingReq.current = nextReqs[nextSelectedIndex];
    (describeReq as any).cache = new WeakMap();
    setSelectedIndex(nextSelectedIndex);
    setReqs(nextReqs);
  };

  const clear = () => {
    history.clearHistory();
    initialize();
  };

  const restore = (req: any = selectedReq.current) => {
    history.restoreFromHistory(req);
  };

  useEffect(() => {
    initialize();
  }, []);

  return (
    <div className="conHistory">
      <h2 className="kuiLocalDropdownTitle">
        {i18n.translate('console.historyPage.pageTitle', { defaultMessage: 'History' })}
      </h2>
      <div className="conHistory__body">
        {/* eslint-disable-next-line */}
        <ul
          onKeyDown={(ev: React.KeyboardEvent) => {
            if (ev.keyCode === keyCodes.ENTER) {
              restore();
              return;
            }

            if (ev.keyCode === keyCodes.UP) {
              ev.preventDefault();
              setSelectedIndex(selectedIndex - 1);
            } else if (ev.keyCode === keyCodes.DOWN) {
              ev.preventDefault();
              setSelectedIndex(selectedIndex + 1);
            }

            const nextSelectedIndex = Math.min(Math.max(0, selectedIndex), reqs.length - 1);

            selectedReq.current = reqs[nextSelectedIndex];
            viewingReq.current = reqs[nextSelectedIndex];
            setSelectedIndex(nextSelectedIndex);
          }}
          className="list-group conHistory__reqs"
          tabIndex={0}
          aria-activedescendant="historyReq{{ history.selectedIndex }}"
          scrollto-activedescendant
          ng-keydown="history.onKeyDown($event)"
          aria-label="{{:: 'console.historyPage.requestListAriaLabel' | i18n: { defaultMessage: 'History of sent requests' } }}"
        >
          {reqs.map((req, idx) => {
            const isSelected = viewingReq === req;
            return (
              // Ignore a11y issues on li's
              // eslint-disable-next-line
              <li
                key={idx}
                className={`list-group-item conHistory__req ${
                  isSelected ? 'conHistory__req-selected' : ''
                }`}
                onClick={() => {
                  selectedReq.current = req;
                  viewingReq.current = req;
                  setSelectedIndex(idx);
                }}
                onMouseEnter={() => (viewingReq.current = req)}
                onMouseLeave={() => (viewingReq.current = selectedReq.current)}
                onDoubleClick={() => restore(req)}
                aria-label={i18n.translate('console.historyPage.itemOfRequestListAriaLabel', {
                  defaultMessage: 'Request: {historyItem}',
                  values: { historyItem: describeReq(req) },
                })}
                aria-selected={selectedReq === req}
              >
                {describeReq(req)}
                <span className="conHistory__reqIcon">
                  <i className="fa fa-chevron-right" />
                </span>
              </li>
            );
          })}
        </ul>

        {/* <sense-history-viewer className="conHistory__viewer" req="history.viewingReq"/> */}
      </div>

      <div className="conHistory__footer">
        <button className="kuiButton kuiButton--danger" onClick={() => clear()}>
          {i18n.translate('console.historyPage.clearHistoryButtonLabel', {
            defaultMessage: 'Clear',
          })}
        </button>

        <div className="conHistory__footerButtonsRight">
          <button className="kuiButton kuiButton--hollow" onClick={() => close()}>
            {i18n.translate('console.historyPage.closehistoryButtonLabel', {
              defaultMessage: 'Close',
            })}
          </button>

          <button
            className="kuiButton kuiButton--primary"
            disabled={!selectedReq}
            onClick={() => restore()}
          >
            {i18n.translate('console.historyPage.applyHistoryButtonLabel', {
              defaultMessage: 'Apply',
            })}
          </button>
        </div>
      </div>
    </div>
  );
}
