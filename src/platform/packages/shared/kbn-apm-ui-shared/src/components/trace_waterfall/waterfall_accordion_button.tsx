/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { TRACE_WATERFALL_EBT_CLICK_ACTIONS } from './ebt_constants';

export interface WaterfallAccordionButtonProps {
  isOpen: boolean;
  onClick: () => void;
  /** EBT click `element` supplied by the hosting waterfall so fold/unfold clicks can be attributed to its surface. */
  ebtElement?: string;
}

export function WaterfallAccordionButton({
  isOpen,
  onClick,
  ebtElement,
}: WaterfallAccordionButtonProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiToolTip
      content={i18n.translate('apmUiShared.waterfall.foldButton.ariaLabel', {
        defaultMessage: 'Click to {isAccordionOpen} the waterfall',
        values: {
          isAccordionOpen: isOpen
            ? i18n.translate('apmUiShared.waterfall.foldButton.ariaLabel.fold', {
                defaultMessage: 'fold',
              })
            : i18n.translate('apmUiShared.waterfall.foldButton.ariaLabel.unfold', {
                defaultMessage: 'unfold',
              }),
        },
      })}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        size="m"
        onClick={onClick}
        iconType={isOpen ? 'fold' : 'unfold'}
        data-test-subj="traceWaterfallAccordionButton"
        {...(ebtElement
          ? getEbtProps({
              action: TRACE_WATERFALL_EBT_CLICK_ACTIONS.TOGGLE_ALL_ROWS,
              element: ebtElement,
              detail: isOpen ? 'fold' : 'unfold',
            })
          : {})}
        css={css`
          position: absolute;
          z-index: ${euiTheme.levels.menu};
          padding: ${euiTheme.size.m};
          width: auto;
        `}
        aria-label={i18n.translate('apmUiShared.waterfall.foldButton.ariaLabel', {
          defaultMessage: 'Click to {isAccordionOpen} the waterfall',
          values: {
            isAccordionOpen: isOpen
              ? i18n.translate('apmUiShared.waterfall.foldButton.ariaLabel.fold', {
                  defaultMessage: 'fold',
                })
              : i18n.translate('apmUiShared.waterfall.foldButton.ariaLabel.unfold', {
                  defaultMessage: 'unfold',
                }),
          },
        })}
      />
    </EuiToolTip>
  );
}
