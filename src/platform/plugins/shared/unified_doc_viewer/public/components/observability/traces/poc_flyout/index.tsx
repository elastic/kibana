/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiText, EuiButton, EuiFlyout, EuiFlyoutBody } from '@elastic/eui';

import { Overview } from '../doc_viewer_overview/overview';

export interface POCFlyoutProps {
  hit: DataTableRecord;
  dataView: DataView;
}

type FlyoutSessionProps = POCFlyoutProps;

export function POCFlyout({ hit, dataView }: POCFlyoutProps) {
  return (
    <>
      <FlyoutSession hit={hit} dataView={dataView} />
    </>
  );
}

const FlyoutSession: React.FC<FlyoutSessionProps> = (props) => {
  const { hit, dataView } = props;

  const [isFlyoutVisible, setIsFlyoutVisible] = React.useState(false);
  const [isChildFlyoutVisible, setIsChildFlyoutVisible] = React.useState(false);
  const [isWaterfallFlyoutVisible, setIsWaterfallFlyoutVisible] = React.useState(false);
  const [isChildWaterfallFlyoutVisible, setIsChildWaterfallFlyoutVisible] = React.useState(false);

  const handleOpenMainFlyout = () => {
    setIsFlyoutVisible(true);
  };

  const handleCloseMainFlyout = () => {
    setIsFlyoutVisible(false);
    setIsChildFlyoutVisible(false);
    setIsWaterfallFlyoutVisible(false);
  };

  return (
    <>
      <EuiText>
        <EuiButton onClick={handleOpenMainFlyout}>Open document (flyout session)</EuiButton>
      </EuiText>
      {isFlyoutVisible && (
        <EuiFlyout
          onClose={handleCloseMainFlyout}
          type="overlay"
          size="m"
          session={true}
          aria-label="Document"
        >
          <EuiFlyoutBody>
            <EuiButton
              onClick={() => setIsChildFlyoutVisible(true)}
              disabled={isChildFlyoutVisible}
            >
              Open doc log/error (child flyout)
            </EuiButton>
            <br />
            <br />
            <EuiButton
              onClick={() => setIsWaterfallFlyoutVisible(true)}
              disabled={isWaterfallFlyoutVisible}
            >
              Open waterfall (main flyout - new session)
            </EuiButton>
            <Overview
              hit={hit}
              dataView={dataView}
              indexes={{
                apm: {
                  traces: '',
                  errors: '',
                },
                logs: '',
              }}
            />

            {isChildFlyoutVisible && (
              <EuiFlyout
                onClose={() => setIsChildFlyoutVisible(false)}
                size="fill"
                aria-label="Log/error (from overview)"
              >
                <EuiFlyoutBody>
                  <Overview
                    hit={hit}
                    dataView={dataView}
                    indexes={{
                      apm: {
                        traces: '',
                        errors: '',
                      },
                      logs: '',
                    }}
                  />
                </EuiFlyoutBody>
              </EuiFlyout>
            )}
          </EuiFlyoutBody>
        </EuiFlyout>
      )}

      {isWaterfallFlyoutVisible && (
        <EuiFlyout
          onClose={() => setIsWaterfallFlyoutVisible(false)}
          size="m"
          aria-label="[<- Back button to overview] Waterfall"
          session={true}
        >
          <EuiFlyoutBody>
            Waterfall
            <br />
            <br />
            <EuiButton
              onClick={() => setIsChildWaterfallFlyoutVisible(true)}
              disabled={isChildWaterfallFlyoutVisible}
            >
              Open span/error (child flyout)
            </EuiButton>
            {isChildWaterfallFlyoutVisible && (
              <EuiFlyout
                onClose={() => setIsChildWaterfallFlyoutVisible(false)}
                size="fill"
                aria-label="Log/error (from waterfall)"
              >
                <EuiFlyoutBody>
                  <Overview
                    hit={hit}
                    dataView={dataView}
                    indexes={{
                      apm: {
                        traces: '',
                        errors: '',
                      },
                      logs: '',
                    }}
                  />
                </EuiFlyoutBody>
              </EuiFlyout>
            )}
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
