/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * The UI and related logic for the welcome screen that *should* show only
 * when it is enabled (the default) and there is no Kibana-consumed data
 * in Elasticsearch.
 */

import React, { useEffect } from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPortal,
  UseEuiTheme,
  useEuiShadow,
  mathWithUnits,
} from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useKbnFullScreenBgCss } from '@kbn/css-utils/public/full_screen_bg_css';
import { getServices } from '../kibana_services';

import { SampleDataCard } from './sample_data';

interface WelcomeProps {
  urlBasePath: string;
  onSkip: () => void;
}
/**
 * Shows a full-screen welcome page that gives helpful quick links to beginners.
 */
export const Welcome: React.FC<WelcomeProps> = ({ urlBasePath, onSkip }: WelcomeProps) => {
  const services = getServices();
  const euiShadowM = useEuiShadow('m');

  const kbnFullScreenBgCss = useKbnFullScreenBgCss();

  const redirectToAddData = () => {
    services.application.navigateToApp('integrations', { path: '/browse' });
  };

  const onSampleDataDecline = () => {
    services.trackUiMetric(METRIC_TYPE.CLICK, 'sampleDataDecline');
    onSkip();
  };

  const onSampleDataConfirm = () => {
    services.trackUiMetric(METRIC_TYPE.CLICK, 'sampleDataConfirm');
    redirectToAddData();
  };

  useEffect(() => {
    const hideOnEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      }
    };
    const { welcomeService } = services;
    services.trackUiMetric(METRIC_TYPE.LOADED, 'welcomeScreenMount');
    document.addEventListener('keydown', hideOnEsc);
    welcomeService.onRendered();

    return () => {
      document.removeEventListener('keydown', hideOnEsc);
    };
  }, [onSkip, services]);

  const { welcomeService } = services;

  return (
    <EuiPortal>
      <div data-test-subj="homeWelcomeInterstitial" css={[styles, kbnFullScreenBgCss]}>
        <header className="homeWelcome__header">
          <div className="homeWelcome__content eui-textCenter">
            <EuiSpacer size="xl" />
            <span
              className="homeWelcome__logo"
              css={css`
                ${euiShadowM}
              `}
            >
              <EuiIcon type="logoElastic" size="xxl" />
            </span>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage id="home.welcomeTitle" defaultMessage="Welcome to Elastic" />
              </h1>
            </EuiTitle>
            <EuiSpacer size="m" />
          </div>
        </header>
        <div className="homeWelcome__content">
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <SampleDataCard
                urlBasePath={urlBasePath}
                onConfirm={onSampleDataConfirm}
                onDecline={onSampleDataDecline}
              />
              <EuiSpacer size="s" />
              {welcomeService.renderTelemetryNotice()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    </EuiPortal>
  );
};
const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    '.homeWelcome__header': {
      padding: euiTheme.size.xl,
      zIndex: 10,
    },
    '.homeWelcome__logo': {
      marginBottom: euiTheme.size.xl,
      display: 'inline-block',
    },
    '.homeWelcome__content': {
      margin: 'auto',
      maxWidth: mathWithUnits(euiTheme.size.xxxxl, (x) => x * 8),
      paddingLeft: euiTheme.size.xl,
      paddingRight: euiTheme.size.xl,
      zIndex: 10,
    },
  });
