/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToolTip, EuiBadge, type EuiToolTipProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface RelatedPanelProps {
  canIndicateRelatedPanels: boolean;
  isIndicatingRelatedPanels: boolean;
  numberOfRelatedPanels?: number;
}
// Throw a typescript error if one, but not all, of the related panel props are defined
// Prevents us from e.g. setting canIndicateRelatedPanels to true and forgetting to pass isIndicatingRelatedPanels
type AllRelatedPanelPropsOrNone = RelatedPanelProps | { [K in keyof RelatedPanelProps]?: never };

type Props = Partial<EuiToolTipProps> & {
  panelLabel?: string;
  panelTooltipLabel?: string;
} & AllRelatedPanelPropsOrNone;

export const ControlLabelTooltip: React.FC<Props> = ({
  canIndicateRelatedPanels,
  isIndicatingRelatedPanels,
  numberOfRelatedPanels,
  panelLabel,
  panelTooltipLabel,
  ...rest
}) => {
  const relatedPanelCountBadge =
    canIndicateRelatedPanels && numberOfRelatedPanels !== undefined ? (
      <EuiBadge color="hollow">
        {i18n.translate('controls.controlGroup.numberOfRelatedPanels', {
          defaultMessage: '{numberOfRelatedPanels, plural, one {# panel} other {# panels}}',
          values: { numberOfRelatedPanels },
        })}
      </EuiBadge>
    ) : null;

  const tooltipContent =
    numberOfRelatedPanels === 0
      ? i18n.translate('controls.controlGroup.noRelatedPanels', {
          defaultMessage:
            // In practice, this message can only appear for ES|QL controls
            "This variable isn't used in any visualizations.",
        })
      : isIndicatingRelatedPanels
      ? i18n.translate('controls.controlGroup.clickToStopHighlighting', {
          defaultMessage: 'Click to stop highlighting panels.',
        })
      : i18n.translate('controls.controlGroup.clickToHighlight', {
          defaultMessage: 'Click to highlight panels.',
        });

  const tooltipProps = canIndicateRelatedPanels
    ? {
        title: (
          <>
            {panelTooltipLabel ?? panelLabel} {relatedPanelCountBadge}
          </>
        ),
        content: tooltipContent,
      }
    : { content: panelTooltipLabel ?? panelLabel };

  return <EuiToolTip {...tooltipProps} {...rest} id={rest.id} />;
};
