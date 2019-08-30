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

import { useAppContext } from '../../../../context';
import { HistoryViewer } from './history_viewer';

interface Props {
  close: () => void;
}

export function ConsoleHistory({ close }: Props) {
  const {
    services: { history, settings },
    ResizeChecker,
  } = useAppContext();

  const [reqs, setReqs] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const selectedReq = useRef<any>(null);
  const viewingReq = useRef<any>(null);

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

  /* eslint-disable */
  return (
    <div className="conHistory">
      <h2 className="kuiLocalDropdownTitle">
        {i18n.translate('console.historyPage.pageTitle', { defaultMessage: 'History' })}
      </h2>
      <div className="conHistory__body">
        <ul
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

            const nextSelectedIndex = Math.min(Math.max(0, currentIdx), reqs.length - 1);

            selectedReq.current = reqs[nextSelectedIndex];
            viewingReq.current = reqs[nextSelectedIndex];
            setSelectedIndex(nextSelectedIndex);
          }}
          role="listbox"
          className="list-group conHistory__reqs"
          tabIndex={0}
          aria-activedescendant={`historyReq${selectedIndex}`}
          scrollto-activedescendant="true"
          aria-label={i18n.translate('console.historyPage.requestListAriaLabel', {
            defaultMessage: 'History of sent requests',
          })}
        >
          {reqs.map((req, idx) => {
            const reqDescription = describeReq(req);
            const isSelected = viewingReq.current === req;
            return (
              // Ignore a11y issues on li's
              // eslint-disable-next-line
              <li
                key={idx}
                id={`historyReq${idx}`}
                className={`list-group-item conHistory__req ${
                  isSelected ? 'conHistory__req-selected' : ''
                }`}
                onClick={() => {
                  selectedReq.current = req;
                  viewingReq.current = req;
                  setSelectedIndex(idx);
                }}
                role="option"
                onMouseEnter={() => (viewingReq.current = req)}
                onMouseLeave={() => (viewingReq.current = selectedReq.current)}
                onDoubleClick={() => restore(req)}
                aria-label={i18n.translate('console.historyPage.itemOfRequestListAriaLabel', {
                  defaultMessage: 'Request: {historyItem}',
                  values: { historyItem: reqDescription },
                })}
                aria-selected={isSelected}
              >
                {reqDescription}
                <span className="conHistory__reqIcon">
                  <i className="fa fa-chevron-right" />
                </span>
              </li>
            );
          })}
        </ul>

        <HistoryViewer
          settings={settings}
          req={viewingReq.current!}
          ResizeChecker={ResizeChecker}
        />
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
