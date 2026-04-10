/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useBackButton } from './hooks';

export const BackButton = React.memo(() => {
  const back = useBackButton();

  const ariaLabel = useMemo(() => {
    if (!back) {
      return '';
    }
    if (back.backDestinationLabel) {
      return i18n.translate('core.ui.chrome.appHeader.backButtonAriaLabelWithDestination', {
        defaultMessage: 'Back to {destination}',
        values: { destination: back.backDestinationLabel },
      });
    }
    return i18n.translate('core.ui.chrome.appHeader.backButtonAriaLabel', {
      defaultMessage: 'Back',
    });
  }, [back]);

  if (!back) {
    return null;
  }

  return (
    <EuiButtonIcon
      iconType="arrowLeft"
      color="text"
      display="empty"
      size="s"
      aria-label={ariaLabel}
      data-test-subj="chromeNextAppHeaderBack"
      href={back.backHref}
    />
  );
});

BackButton.displayName = 'BackButton';
