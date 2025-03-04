/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useRef } from 'react';
import { JourneyFlyout } from '../journey_flyouts/journey_flyout';
import { JourneyFlyoutApi, JourneyFlyoutProps } from '../journey_flyouts/types';
import hostsFlyoutImage from './screenshots/HostsFlyout.png';
import alertsImage from './screenshots/Alerts.png';
import metadataFieldsImage from './screenshots/MetadataFields.png';
import serviceMetricsImage from './screenshots/ServiceMetrics.png';

const Alerts = () => {
  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        justify-content: center;
      `}
    >
      <img src={alertsImage} alt="Host flyout" width="750px" />
    </div>
  );
};

const MetadataFields = () => {
  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        justify-content: center;
      `}
    >
      <img src={metadataFieldsImage} alt="Host flyout" width="750px" />
    </div>
  );
};

const ServiceMetrics = () => {
  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        justify-content: center;
      `}
    >
      <img src={serviceMetricsImage} alt="Host flyout" width="750px" />
    </div>
  );
};

export const HostFlyout = ({ openChildFlyout }: JourneyFlyoutProps) => {
  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        justify-content: center;
      `}
    >
      <img src={hostsFlyoutImage} alt="Host flyout" width="480px" />
      <div
        css={css`
          position: absolute;
          top: 275px;
          left: 20px;
        `}
      >
        <EuiButtonEmpty
          size="s"
          onClick={() => {
            openChildFlyout({ Component: Alerts, width: 800 });
          }}
          iconType="arrowStart"
          iconSide="left"
        >
          Show alerts
        </EuiButtonEmpty>
      </div>
      <div
        css={css`
          position: absolute;
          top: 448px;
          left: 20px;
        `}
      >
        <EuiButtonEmpty
          size="s"
          onClick={() => {
            openChildFlyout({ Component: MetadataFields, width: 800 });
          }}
          iconType="arrowStart"
          iconSide="left"
        >
          Show all metadata fields
        </EuiButtonEmpty>
      </div>
      <div
        css={css`
          position: absolute;
          top: 644px;
          left: 20px;
        `}
      >
        <EuiButtonEmpty
          size="s"
          onClick={() => {
            openChildFlyout({ Component: ServiceMetrics, width: 800 });
          }}
          iconType="arrowStart"
          iconSide="left"
        >
          Show service metrics
        </EuiButtonEmpty>
      </div>
    </div>
  );
};

export const ObservabilityExample = () => {
  const flyoutApi = useRef<JourneyFlyoutApi | null>(null);

  return (
    <>
      <EuiButton
        onClick={() => flyoutApi.current?.openFlyout({ Component: HostFlyout, width: 500 })}
      >
        Show host flyout
      </EuiButton>
      <JourneyFlyout childBackgroundColor="#ecf1f9" ref={flyoutApi} />
    </>
  );
};
