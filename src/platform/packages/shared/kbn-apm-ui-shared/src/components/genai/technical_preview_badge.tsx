/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

type Props = {
  icon?: IconType;
} & Pick<React.ComponentProps<typeof EuiBetaBadge>, 'size' | 'style'>;

export function GenAiTechnicalPreviewBadge({ icon = 'flask', size = 's', style }: Props) {
  const description = i18n.translate('apmUiShared.genAi.technicalPreviewBadgeDescription', {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  });

  return (
    <EuiBetaBadge
      label={i18n.translate('apmUiShared.genAi.technicalPreviewBadgeLabel', {
        defaultMessage: 'Technical preview',
      })}
      aria-label={description}
      tooltipContent={description}
      iconType={icon}
      size={size}
      style={style}
    />
  );
}
