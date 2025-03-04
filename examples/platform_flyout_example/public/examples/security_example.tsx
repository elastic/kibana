/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiButton, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useRef, useState } from 'react';
import { JourneyFlyout } from '../journey_flyouts/journey_flyout';
import { JourneyFlyoutApi, JourneyFlyoutProps } from '../journey_flyouts/types';
import securityAlertsImage from './screenshots/Security/AlertsPage.png';
import analyzerGraphImage from './screenshots/Security/AnalyzerGraph.png';
import analyzerGraphAlertImage from './screenshots/Security/AnalyzerGraphAlert.png';
import analyzerGraphMalwareImage from './screenshots/Security/AnalyzerGraphMalware.png';
import detectionImage from './screenshots/Security/Detection.png';
import eventDetailsImage from './screenshots/Security/EventDetails.png';
import hostRiskSummaryImage from './screenshots/Security/HostRiskSummary.png';
import showLogsImage from './screenshots/Security/ShowLogs.png';

const pageWidth = '1750px';

const Detection = ({ openNextFlyout, openChildFlyout }: JourneyFlyoutProps) => {
  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        justify-content: center;
      `}
    >
      <div
        css={css`
          position: absolute;
          top: 388px;
          left: 20px;
        `}
      >
        <EuiButtonEmpty
          size="s"
          onClick={() => {
            openNextFlyout({ Component: AnalyzerGraph, width: 1100 });
          }}
          iconType="inspect"
          iconSide="right"
        >
          Analyzer graph
        </EuiButtonEmpty>
      </div>
      <img src={detectionImage} alt="Detection" width="475px" />
    </div>
  );
};

const AnalyzerGraph = ({ openNextFlyout, openChildFlyout }: JourneyFlyoutProps) => {
  const [imageToShow, setImageToShow] = useState<'base' | 'alert' | 'malware'>('base');

  const getImage = useCallback(() => {
    switch (imageToShow) {
      case 'base':
        return (
          <>
            <div
              css={css`
                position: absolute;
                top: 713px;
                left: 737px;
              `}
            >
              <EuiBadge
                color="hollow"
                onClick={() => setImageToShow('malware')}
                onClickAriaLabel="Malware"
              >
                1 malware
              </EuiBadge>
            </div>
            <img src={analyzerGraphImage} alt="Analyzer Graph" width="1075px" />
          </>
        );
      case 'alert':
        return <img src={analyzerGraphAlertImage} alt="Analyzer Graph Alert" width="1075px" />;
      case 'malware':
        return (
          <>
            <img src={analyzerGraphMalwareImage} alt="Analyzer Graph Malware" width="1075px" />
            <div
              css={css`
                position: absolute;
                top: 215px;
                left: 30px;
              `}
            >
              <EuiButtonEmpty
                size="s"
                onClick={() => {
                  openChildFlyout({ Component: EventDetails, width: 500 });
                }}
                iconType="inspect"
                iconSide="right"
              >
                D30AD6F60F2447E2
              </EuiButtonEmpty>
            </div>
          </>
        );
    }
  }, [imageToShow, openChildFlyout]);

  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        justify-content: center;
      `}
    >
      {getImage()}
    </div>
  );
};

const EventDetails = ({ openNextFlyout, openChildFlyout }: JourneyFlyoutProps) => {
  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        justify-content: center;
      `}
    >
      <img src={eventDetailsImage} alt="Event Details" width="475px" />
      <div
        css={css`
          position: absolute;
          top: 385px;
          left: 25px;
        `}
      >
        <EuiButtonEmpty
          size="s"
          onClick={() => {
            openNextFlyout({ Component: HostRiskSummary, width: 500 });
          }}
          iconType="storage"
        >
          srv-win-s1-rsa
        </EuiButtonEmpty>
      </div>
    </div>
  );
};

const HostRiskSummary = ({ openNextFlyout, openChildFlyout }: JourneyFlyoutProps) => {
  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        justify-content: center;
      `}
    >
      <img src={hostRiskSummaryImage} alt="Host Risk" width="475px" />
      <div
        css={css`
          position: absolute;
          top: 585px;
          left: 15px;
        `}
      >
        <EuiButton
          color="text"
          size="s"
          onClick={() => {
            openChildFlyout({ Component: ShowLogs, width: 1000 });
          }}
          iconType="inspect"
          iconSide="right"
        >
          Show logs
        </EuiButton>
      </div>
    </div>
  );
};

const ShowLogs = ({ openNextFlyout, openChildFlyout }: JourneyFlyoutProps) => {
  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        justify-content: center;
      `}
    >
      <img src={showLogsImage} alt="Show Logs" width="975px" />
    </div>
  );
};

export const SecurityExample = () => {
  const flyoutApi = useRef<JourneyFlyoutApi | null>(null);

  return (
    <>
      <div
        css={css`
          width: 100%;
          display: flex;
          justify-content: center;
        `}
      >
        <div
          css={css`
            width: ${pageWidth};
            position: relative;
          `}
        >
          <img src={securityAlertsImage} alt="Security alerts page" width={pageWidth} />
          <div
            css={css`
              position: absolute;
              top: 850px;
              left: 34px;
            `}
          >
            <EuiButtonIcon
              size="xs"
              onClick={() => {
                flyoutApi.current?.openFlyout({ Component: Detection, width: 500 });
              }}
              iconType="expand"
            />
          </div>
          <div
            css={css`
              position: absolute;
              top: 850px;
              left: 154px;
            `}
          >
            <EuiButtonIcon size="xs" onClick={() => {}} iconType="analyzeEvent" />
          </div>
        </div>
      </div>

      <JourneyFlyout ref={flyoutApi} />
    </>
  );
};
