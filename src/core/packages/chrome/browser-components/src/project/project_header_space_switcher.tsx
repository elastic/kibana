/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiPopover, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useState } from 'react';

import { useSpaceSwitcherBreadcrumb } from '../shared/chrome_hooks';

/** Match {@link header.tsx} compact header controls. */
const PROJECT_HEADER_COMPACT_CONTROL_PX = 32;

export const ProjectHeaderSpaceSwitcher = React.memo(() => {
  const crumb = useSpaceSwitcherBreadcrumb();
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  const triggerButtonCss = css`
    &&& {
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      block-size: ${PROJECT_HEADER_COMPACT_CONTROL_PX}px;
      min-block-size: ${PROJECT_HEADER_COMPACT_CONTROL_PX}px;
      max-block-size: ${PROJECT_HEADER_COMPACT_CONTROL_PX}px;
      min-inline-size: 0;
      padding-block: 0;
      padding-inline: ${euiTheme.size.s};
      border-radius: ${euiTheme.border.radius.small};
      line-height: 1;
      color: ${euiTheme.colors.textSubdued};
      font-weight: ${euiTheme.font.weight.regular};
    }

    &&& .euiButtonEmpty__text,
    &&& .euiIcon {
      color: inherit;
    }

    &&&:hover,
    &&&:focus {
      text-decoration: none !important;
      color: ${euiTheme.colors.textSubdued};
    }

    &&&:hover {
      background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
    }
  `;

  if (!crumb?.popoverContent) {
    return null;
  }

  const panel =
    typeof crumb.popoverContent === 'function'
      ? crumb.popoverContent(closePopover)
      : crumb.popoverContent;

  return (
    <EuiPopover
      {...crumb.popoverProps}
      isOpen={isOpen}
      closePopover={closePopover}
      button={
        <EuiButtonEmpty
          css={triggerButtonCss}
          color="text"
          data-test-subj={crumb['data-test-subj']}
          iconSide="right"
          iconSize="s"
          iconType="arrowDown"
          size="s"
          onClick={togglePopover}
          aria-label={crumb['aria-label']}
        >
          {crumb.text}
        </EuiButtonEmpty>
      }
    >
      {panel}
    </EuiPopover>
  );
});

ProjectHeaderSpaceSwitcher.displayName = 'ProjectHeaderSpaceSwitcher';
