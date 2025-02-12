/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHeaderLogo, EuiHeaderLogoProps, EuiLoadingSpinner, IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface WorkspaceHeaderLogoComponentProps
  extends Pick<EuiHeaderLogoProps, 'href' | 'onClick'>,
    Partial<Pick<EuiHeaderLogoProps, 'iconType'>> {
  isLoading?: boolean;
}

const ariaLabel = i18n.translate('core.ui.primaryNav.goToHome.ariaLabel', {
  defaultMessage: 'Go to home page',
});

export const WorkspaceHeaderLogoComponent = ({
  isLoading,
  iconType: iconTypeProp = 'logoElastic',
  ...props
}: WorkspaceHeaderLogoComponentProps) => {
  let iconType: IconType = iconTypeProp;

  if (isLoading) {
    iconType = () => (
      <EuiLoadingSpinner size="l" aria-hidden={false} data-test-subj="globalLoadingIndicator" />
    );
  }

  return <EuiHeaderLogo iconType={iconType} aria-label={ariaLabel} {...props} />;
};
