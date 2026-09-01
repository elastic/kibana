/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { EuiButtonGroupOptionProps, IconType, EuiButtonGroupProps } from '@elastic/eui';
import { EuiButtonGroup, EuiButtonIcon, EuiToolTip, htmlIdGenerator } from '@elastic/eui';

/**
 * An interface representing a single icon button in the `IconButtonGroup`.
 */
export interface IconButton {
  /** The accessible button label. */
  label: string;
  /** EUI `IconType` to display. */
  iconType: IconType;
  /** Handler for button click. */
  onClick: () => void;
  /**
   * HTML `title` attribute for the native browser tooltip. Defaults to `label`.
   * Ignored when `toolTipContent` is provided — the native tooltip is suppressed
   * so only the `EuiToolTip` is shown.
   */
  title?: string;
  /** Test subject for button */
  'data-test-subj'?: string;
  /** EBT click action */
  'data-ebt-action'?: string;
  /** EBT click element */
  'data-ebt-element'?: string;
  /** Optional EBT click detail */
  'data-ebt-detail'?: string;
  /** To disable the action **/
  isDisabled?: boolean;
  /** Tooltip content */
  toolTipContent?: EuiButtonGroupOptionProps['toolTipContent'];
  /** Tooltip props */
  toolTipProps?: EuiButtonGroupOptionProps['toolTipProps'];
  /** A11y for button */
  'aria-expanded'?: boolean;
  /** A11y for button */
  'aria-controls'?: string;
}

/**
 * Props for `IconButtonGroup`.
 */
export interface Props {
  /** Required accessible legend for the whole group */
  legend: EuiButtonGroupProps['legend'];
  /** Array of `IconButton` */
  buttons: IconButton[];
  /** Button size */
  buttonSize?: EuiButtonGroupProps['buttonSize'];
  /** Test subject for button group */
  'data-test-subj'?: string;
}

/**
 * A group of buttons each performing an action, represented by an icon.
 */
export const IconButtonGroup = ({
  buttons,
  legend,
  buttonSize = 'm',
  'data-test-subj': dataTestSubj,
}: Props) => {
  const size = buttonSize === 'compressed' ? 's' : buttonSize;

  const buttonIds = useMemo(
    () => buttons.map((_, index) => htmlIdGenerator()(`${index}`)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buttons.length]
  );

  return (
    <EuiButtonGroup
      data-test-subj={dataTestSubj}
      buttonSize={size}
      legend={legend}
      variant="segmented"
      wrap={false}
    >
      {buttons.map((button, index) => {
        const { label, title, toolTipContent, toolTipProps, ...rest } = button;
        const id = buttonIds[index];
        const titleProp = { title: toolTipContent !== undefined ? '' : title ?? label };

        const element = (
          <EuiButtonIcon {...rest} key={id} id={id} aria-label={title ?? label} {...titleProp} />
        );

        return toolTipContent ? (
          <EuiToolTip key={id} content={toolTipContent} {...toolTipProps}>
            {element}
          </EuiToolTip>
        ) : (
          element
        );
      })}
    </EuiButtonGroup>
  );
};
