/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiBetaBadge, EuiBetaBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FieldDefinition, SettingType } from '@kbn/management-settings-types';
import { isBoolean } from 'lodash';

/**
 * Props for a {@link FieldTitle} component.
 */
export interface TechnicalPreviewBadgeProps<T extends SettingType> {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Pick<FieldDefinition<T>, 'technicalPreview'>;
}

const defaultLabel = i18n.translate('management.settings.field.technicalPreviewLabel', {
  defaultMessage: 'Technical preview',
});

const defaultTooltip = i18n.translate('management.settings.technicalPreviewDefaultTooltip', {
  defaultMessage:
    'This functionality is in technical preview. It may change or be removed in a future release.',
});

const badgeBaseProps: Pick<EuiBetaBadgeProps, 'alignment' | 'label' | 'size'> = {
  alignment: 'middle',
  label: defaultLabel,
  size: 's',
};

/**
 *
 */
export const FieldTitleTechnicalPreviewBadge = <T extends SettingType>({
  field,
}: TechnicalPreviewBadgeProps<T>) => {
  if (!field.technicalPreview) {
    return null;
  }

  if (isBoolean(field.technicalPreview)) {
    return <EuiBetaBadge {...badgeBaseProps} tooltipContent={defaultTooltip} />;
  }

  if (!field.technicalPreview.docLinksKey) {
    return (
      <EuiBetaBadge
        {...badgeBaseProps}
        tooltipContent={field.technicalPreview.message || defaultTooltip}
      />
    );
  }

  return (
    <EuiBetaBadge
      {...badgeBaseProps}
      tooltipContent={field.technicalPreview.message || defaultTooltip}
      href={field.technicalPreview.docLinksKey}
      target="_blank"
    />
  );
};
