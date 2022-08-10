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

const title = i18n.translate('homePackages.largeDataSetPanel.title', {
  defaultMessage: 'Generate large data set',
});

const message = i18n.translate('homePackages.largeDataSetPanel.message', {
  defaultMessage: 'Generate a large data set. Takes about 10 minutes',
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

interface Props {
  install: () => Promise<void>;
}

export const LargeDatasetPanel = ({ install }: Props) => {
  const [imageSrc] = useSVG();
  const [installed, setInstalled] = useState<boolean>(false);

  const image = imageSrc ? <EuiImage alt={'demo image'} size="l" src={imageSrc} /> : null;

  const onClick = async () => {
    await install();
    setInstalled(true);
  };

  const installedLayout = (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiText size="s">
          <h2>Started generation of a large dataset</h2>
          <p>
            This may take a while. You will be able to see your data in Discover once it is ready
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ textAlign: 'center' }}>
        {image}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  const uninstalledLayout = (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiText size="s">
          <h2>{title}</h2>
          <p>{message}</p>
          <EuiButton fill iconSide="right" iconType="popout" onClick={onClick} target="_blank">
            Generate!
          </EuiButton>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ textAlign: 'center' }}>
        {image}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  return (
    <EuiPanel hasBorder paddingSize="xl">
      {installed ? installedLayout : uninstalledLayout}
    </EuiPanel>
  );
};
