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
import type { LinksListItem } from './types';

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
          label={item.label}
          href={item.href}
          onClick={item.onClick}
          external={item.external}
          isDisabled={item.disabled}
          iconType={item.iconType}
          color="text"
          data-test-subj={item['data-test-subj']}
        />
      ))}
    </EuiListGroup>
  );
};
