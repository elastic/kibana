/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

const title = i18n.translate('homePackages.demoEnvironmentPanel.welcomeTitle', {
  defaultMessage: 'Explore our live demo environment',
});

const message = i18n.translate('homePackages.demoEnvironmentPanel.welcomeMessage', {
  defaultMessage:
    "Browse our demo environment and explore the many ways you can gain insights into your own data using Elastic. With its real-world data for search, observability, and security, it's just a few clicks before you find something that you can leverage for your own use cases.",
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
}

export const DemoEnvironmentPanel = ({ demoUrl }: Props) => {
  const [imageSrc] = useSVG();

  const image = imageSrc ? <EuiImage alt={alt} size="l" src={imageSrc} /> : null;

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiText size="s" grow={false}>
            <h2>{title}</h2>
            <p>{message}</p>
            <EuiButton fill iconSide="right" iconType="popout" href={demoUrl} target="_blank">
              Start exploring
            </EuiButton>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{image}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
