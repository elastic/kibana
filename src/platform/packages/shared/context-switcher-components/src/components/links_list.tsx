/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { LinksListItem } from './types';

const EXTERNAL_LINK_SCREEN_READER_TEXT = i18n.translate(
  'contextSwitcherComponents.linksList.externalScreenReaderText',
  {
    defaultMessage: '(opens in a new tab)',
  }
);

export interface LinksListProps {
  readonly items: ReadonlyArray<LinksListItem>;
}

/**
 * Renders a list of links.
 */

export const LinksList = ({ items }: LinksListProps) => {
  return (
    <EuiListGroup>
      {items.map((item) => (
        <EuiListGroupItem
          key={item.id}
          label={item.external ? <ExternalLinkLabel label={item.label} /> : item.label}
          href={item.href}
          onClick={item.onClick}
          // The popout icon is rendered at the end of the row, so suppress EUI's inline one.
          external={false}
          target={item.external ? '_blank' : undefined}
          isDisabled={item.disabled}
          iconType={item.iconType}
          wrapText
          color="text"
          data-test-subj={item['data-test-subj']}
        />
      ))}
    </EuiListGroup>
  );
};

const ExternalLinkLabel = ({ label }: { label: LinksListItem['label'] }) => (
  <EuiFlexGroup
    component="span"
    alignItems="center"
    gutterSize="s"
    responsive={false}
    css={css`
      inline-size: 100%;
    `}
  >
    <EuiFlexItem component="span">{label}</EuiFlexItem>
    <EuiFlexItem component="span" grow={false}>
      <EuiIcon type="external" size="s" color="subdued" aria-hidden={true} />
      <EuiScreenReaderOnly>
        <span>{EXTERNAL_LINK_SCREEN_READER_TEXT}</span>
      </EuiScreenReaderOnly>
    </EuiFlexItem>
  </EuiFlexGroup>
);
