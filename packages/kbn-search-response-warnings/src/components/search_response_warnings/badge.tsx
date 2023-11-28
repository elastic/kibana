/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiButton, EuiIcon, EuiPopover, useEuiTheme, useEuiFontSize } from '@elastic/eui';
import { SearchResponseWarningsBadgePopoverContent } from './badge_popover_content';
import type { SearchResponseWarning } from '../../types';

interface Props {
  warnings: SearchResponseWarning[];
}

export const SearchResponseWarningsBadge = (props: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  if (!props.warnings.length) {
    return null;
  }

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={
        <EuiButton
          minWidth={0}
          size="s"
          color="warning"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          data-test-subj="searchResponseWarningsBadgeToogleButton"
          title={i18n.translate('searchResponseWarnings.badgeButtonLabel', {
            defaultMessage: '{warningCount} {warningCount, plural, one {warning} other {warnings}}',
            values: {
              warningCount: props.warnings.length,
            },
          })}
          css={css`
            block-size: ${euiTheme.size.l};
            font-size: ${xsFontSize};
            padding: 0 ${euiTheme.size.xs};
            & > * {
              gap: ${euiTheme.size.xs};
            }
          `}
        >
          <EuiIcon
            type="warning"
            css={css`
              margin-left: ${euiTheme.size.xxs};
            `}
          />
          {props.warnings.length}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
    >
      <SearchResponseWarningsBadgePopoverContent
        onViewDetailsClick={() => {
          setIsPopoverOpen(false);
        }}
        warnings={props.warnings}
      />
    </EuiPopover>
  );
};
