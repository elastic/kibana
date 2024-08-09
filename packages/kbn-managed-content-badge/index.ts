/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { EuiToolTipProps } from '@elastic/eui';
import type { TopNavMenuBadgeProps } from '@kbn/navigation-plugin/public';

export const getManagedContentBadge: (
  tooltipText: string,
  disableTooltipProps?: boolean
) => TopNavMenuBadgeProps = (tooltipText, enableTooltipProps = true) => ({
  'data-test-subj': 'managedContentBadge',
  badgeText: i18n.translate('managedContentBadge.text', {
    defaultMessage: 'Managed',
  }),
  title: i18n.translate('managedContentBadge.text', {
    defaultMessage: 'Managed',
  }),
  color: 'primary',
  iconType: 'glasses',
  toolTipProps: enableTooltipProps
    ? ({
        content: tooltipText,
        position: 'bottom',
      } as EuiToolTipProps)
    : undefined,
});
