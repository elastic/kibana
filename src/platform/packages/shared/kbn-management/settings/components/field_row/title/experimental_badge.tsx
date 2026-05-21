/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { EuiBetaBadgeProps } from '@elastic/eui';
import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { FieldDefinition, SettingType } from '@kbn/management-settings-types';
import { isBoolean } from 'lodash';

export interface ExperimentalBadgeProps<T extends SettingType> {
  field: Pick<FieldDefinition<T>, 'experimental'>;
}

const defaultLabel = i18n.translate('management.settings.field.experimentalLabel', {
  defaultMessage: 'Experimental',
});

const defaultTooltip = i18n.translate('management.settings.experimentalDefaultTooltip', {
  defaultMessage:
    'This functionality is experimental and may be changed or removed in a future release.',
});

const badgeBaseProps: Pick<EuiBetaBadgeProps, 'alignment' | 'label' | 'size'> = {
  alignment: 'middle',
  label: defaultLabel,
  size: 's',
};

export const FieldTitleExperimentalBadge = <T extends SettingType>({
  field,
}: ExperimentalBadgeProps<T>) => {
  if (!field.experimental) {
    return null;
  }

  if (isBoolean(field.experimental)) {
    return <EuiBetaBadge {...badgeBaseProps} tooltipContent={defaultTooltip} />;
  }

  if (!field.experimental.docLinksKey) {
    return (
      <EuiBetaBadge
        {...badgeBaseProps}
        tooltipContent={field.experimental.message || defaultTooltip}
      />
    );
  }

  return (
    <EuiBetaBadge
      {...badgeBaseProps}
      tooltipContent={field.experimental.message || defaultTooltip}
      href={field.experimental.docLinksKey}
      target="_blank"
    />
  );
};
