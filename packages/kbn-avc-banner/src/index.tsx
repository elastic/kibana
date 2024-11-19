/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import avcBannerBackground from './avc_banner_background.svg';

// Logic to hide banner at EOY 2024
export const useIsStillYear2024: () => boolean = () => {
  return useMemo(() => {
    return new Date().getFullYear() === 2024;
  }, []);
};

export const AVCResultsBanner2024: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const { docLinks } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const bannerTitle = i18n.translate('avcBanner.title', {
    defaultMessage: '100% protection with zero false positives.',
  });

  const calloutStyles = css({
    paddingLeft: `${euiTheme.size.xl}`,
    backgroundImage: `url(${avcBannerBackground})`,
    backgroundRepeat: 'no-repeat',
    backgroundPositionX: 'right',
    backgroundPositionY: 'bottom',
  });

  return (
    <EuiCallOut
      title={bannerTitle}
      color="success"
      iconType="cheer"
      onDismiss={onDismiss}
      className={calloutStyles}
      data-test-subj="avcResultsBanner"
    >
      <FormattedMessage
        id="avcBanner.body"
        defaultMessage="Elastic Security shines in Malware Protection Test by AV-Comparatives"
      />
      <EuiSpacer size="s" />
      <EuiButton
        size="s"
        color="success"
        href={docLinks?.links.securitySolution.avcResults}
        target="_blank"
        data-test-subj="avcReadTheBlog"
      >
        <FormattedMessage id="avcBanner.readTheBlog.link" defaultMessage="Read the blog" />
      </EuiButton>
    </EuiCallOut>
  );
};
