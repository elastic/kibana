/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement, ReactNode } from 'react';
import React, { useMemo } from 'react';
import { EuiBadge, EuiPopover, type EuiBadgeProps, useGeneratedHtmlId } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { openCellActionPopoverAriaText } from './translations';
import { truncateReactNode } from './utils';
import { ContextualBadgePopover } from './summary_column/contextual_badge_popover';
import { useHoverFadePopover } from './summary_column/use_hover_fade_popover';

interface CellActionsPopoverProps {
  onFilter?: DocViewFilterFn;
  /** ECS mapping for the key */
  property?: DataViewField;
  name: string;
  /** Formatted value from field formatter (React node) */
  formattedValue: ReactNode;
  /** Plain text version of the value for copying to clipboard */
  textValue: string;
  /** The raw value from the mapping, can be an object */
  rawValue: unknown;
  /** Optional callback to customize rendering of the formatted value */
  renderFormattedValue?: (formattedValue: ReactNode) => ReactNode;
  icon?: EuiBadgeProps['iconType'];
  onOpenOverview?: () => void;
  isTracesSummary?: boolean;
  /** Props to forward to the trigger Badge */
  renderPopoverTrigger: (props: {
    popoverTriggerProps: {
      onClick?: () => void;
      onClickAriaLabel: string;
      'data-test-subj': string;
    };
  }) => ReactElement;
}

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export function CellActionsPopover({
  onFilter,
  property,
  name,
  formattedValue,
  textValue,
  rawValue,
  icon,
  onOpenOverview,
  isTracesSummary,
  renderPopoverTrigger,
}: CellActionsPopoverProps) {
  const popoverTitleId = useGeneratedHtmlId();
  const { isOpen, isFadingOut, open, scheduleClose, closeNow, fadeMs } = useHoverFadePopover();

  const makeFilterHandlerByOperator = (operator: '+' | '-') => () => {
    if (onFilter) {
      onFilter(property ?? name, rawValue, operator);
      closeNow();
    }
  };

  const popoverTriggerProps = {
    onClickAriaLabel: openCellActionPopoverAriaText,
    'data-test-subj': `dataTableCellActionsPopover_${name}`,
  };

  return (
    <span onMouseEnter={open} onMouseLeave={scheduleClose}>
      <EuiPopover
        aria-labelledby={popoverTitleId}
        button={renderPopoverTrigger({ popoverTriggerProps })}
        isOpen={isOpen}
        closePopover={closeNow}
        anchorPosition="downCenter"
        panelPaddingSize="none"
        ownFocus={false}
        display="inline-block"
        panelProps={{
          onMouseEnter: open,
          onMouseLeave: scheduleClose,
          css: css`
            ${fadeMs === 0
              ? ''
              : isFadingOut
              ? `opacity: 0; transition: opacity ${fadeMs}ms ease;`
              : `animation: ${fadeIn} ${fadeMs}ms ease;`}
          `,
        }}
      >
        <ContextualBadgePopover
          name={name}
          textValue={textValue}
          titleId={popoverTitleId}
          icon={icon}
          onFilterFor={onFilter ? makeFilterHandlerByOperator('+') : undefined}
          onFilterOut={onFilter ? makeFilterHandlerByOperator('-') : undefined}
          onOpenOverview={
            onOpenOverview
              ? () => {
                  onOpenOverview();
                  closeNow();
                }
              : undefined
          }
          onClose={closeNow}
          isTracesSummary={isTracesSummary}
        />
      </EuiPopover>
    </span>
  );
}

export interface FieldBadgeWithActionsProps
  extends Pick<
    CellActionsPopoverProps,
    | 'onFilter'
    | 'name'
    | 'property'
    | 'formattedValue'
    | 'textValue'
    | 'rawValue'
    | 'renderFormattedValue'
    | 'icon'
    | 'onOpenOverview'
    | 'isTracesSummary'
  > {
  color?: string;
  truncateTitle?: boolean;
}

interface FieldBadgeWithActionsDependencies {
  core?: CoreStart;
  share?: SharePluginStart;
}

export type FieldBadgeWithActionsPropsAndDependencies = FieldBadgeWithActionsProps &
  FieldBadgeWithActionsDependencies;

export function FieldBadgeWithActions({
  icon,
  onFilter,
  onOpenOverview,
  isTracesSummary,
  name,
  property,
  renderFormattedValue,
  formattedValue,
  textValue,
  rawValue,
  color = 'hollow',
  truncateTitle = false,
}: FieldBadgeWithActionsPropsAndDependencies) {
  const MAX_LENGTH = 20;

  const displayValue = useMemo(
    () =>
      truncateTitle ? truncateReactNode(formattedValue, MAX_LENGTH, textValue) : formattedValue,
    [truncateTitle, formattedValue, textValue]
  );

  return (
    <CellActionsPopover
      onFilter={onFilter}
      name={name}
      property={property}
      formattedValue={formattedValue}
      textValue={textValue}
      rawValue={rawValue}
      icon={icon}
      onOpenOverview={onOpenOverview}
      isTracesSummary={isTracesSummary}
      renderFormattedValue={renderFormattedValue}
      renderPopoverTrigger={({ popoverTriggerProps }) => (
        <EuiBadge
          {...popoverTriggerProps}
          color={color}
          iconType={icon}
          iconSide="left"
          title={textValue}
        >
          <span>{displayValue}</span>
        </EuiBadge>
      )}
    />
  );
}
