/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiText,
  EuiImage,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DATA_TEST_SUBJ_DEMO_ENV_BUTTON } from './constants';

const title = i18n.translate('homePackages.demoEnvironmentPanel.welcomeTitle', {
  defaultMessage: 'Explore our live demo environment',
});

const message = i18n.translate('homePackages.demoEnvironmentPanel.welcomeMessage', {
  defaultMessage:
    'Browse real-world data in a demo environment where you can explore search, observability, and security use cases like yours.',
});

const alt = i18n.translate('homePackages.demoEnvironmentPanel.welcomeImageAlt', {
  defaultMessage: 'Illustration of Elastic data integrations',
});

const useSVG: () => [string | null, boolean] = () => {
  const { colorMode } = useEuiTheme();
  const ref = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isDark = colorMode === 'DARK';

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        if (isDark) {
          const { default: svg } = await import('./assets/welcome_dark.png');
          ref.current = svg;
        } else {
          const { default: svg } = await import('./assets/welcome_light.png');
          ref.current = svg;
        }
      } catch (e) {
        throw e;
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isDark]);

  return [ref.current, loading];
};

export interface Props {
  demoUrl: string;
  onClick?: () => void;
}

export const DemoEnvironmentPanel = ({ demoUrl, onClick: onClickProp = () => {} }: Props) => {
  const [imageSrc] = useSVG();

  const image = imageSrc ? <EuiImage alt={alt} size="l" src={imageSrc} /> : null;

  const onClick = () => {
    onClickProp();
    window.open(demoUrl, '_blank');
  };

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={1}>
          <EuiText size="s">
            <h2>{title}</h2>
            <p>{message}</p>
            <EuiButton
              fill
              iconSide="right"
              iconType="popout"
              onClick={onClick}
              target="_blank"
              data-test-subj={DATA_TEST_SUBJ_DEMO_ENV_BUTTON}
            >
              Start exploring
            </EuiButton>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={1} style={{ textAlign: 'center' }}>
          {image}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
