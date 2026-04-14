/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiListGroup, EuiListGroupItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { LinksListItem } from './types';

export interface LinksListProps {
  readonly items: ReadonlyArray<LinksListItem>;
}

/**
 * Renders a list of links.
 */

export const LinksList = ({ items }: LinksListProps) => {
  const itemCss = css`
    /* no underline */
    && .euiListGroupItem__button:hover,
    && .euiListGroupItem__button:focus {
      text-decoration: none;
    }
  `;

  return (
    <EuiListGroup gutterSize="none" flush>
      {items.map((item) => (
        <EuiListGroupItem
          css={itemCss}
          key={item.id}
          label={item.label}
          href={item.href}
          onClick={item.onClick}
          external={item.external}
          isDisabled={item.disabled}
          iconType={item.iconType}
          size="s"
          color="text"
          data-test-subj={item['data-test-subj']}
        />
      ))}
    </EuiListGroup>
  );
};
