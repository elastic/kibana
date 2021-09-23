/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { FlexGridColumns } from '@elastic/eui/src/components/flex/flex_grid';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { NavigationButton } from './navigation_button';

interface Props {
  items: JSX.Element[];
  page: number;
  itemsPerPage: number;
}

export function SectionNavigation(props: Props) {
  const { items, page, itemsPerPage } = props;
  const total = items.length;

  const [activePage, setActivePage] = useState(page);

  const start = activePage * itemsPerPage;
  const end = start + itemsPerPage < total ? start + itemsPerPage : total;

  const displayItems: JSX.Element[] = [];

  const onMoreClick = () => {
    setActivePage((activePage + 1) % itemsPerPage);
  };

  const onLessClick = () => {
    const newActivePage = activePage - 1 < 0 ? 0 : activePage - 1;
    setActivePage(newActivePage);
  };

  if (items.length === 0) {
    for (let i = 0; i < itemsPerPage; i++) {
      displayItems.push(
        <EuiFlexItem>
          <LoadingIndicator />
        </EuiFlexItem>
      );
    }
    return <EuiFlexGrid columns={itemsPerPage as FlexGridColumns}>{displayItems}</EuiFlexGrid>;
  }

  if (start > 0) {
    displayItems.push(
      <EuiFlexItem grow={false}>
        <NavigationButton type={'less'} onClick={onLessClick} />
      </EuiFlexItem>
    );
  }

  for (let i = start; i < end; i++) {
    const item = items[i];
    const grow = end - start < itemsPerPage ? false : 3;
    displayItems.push(<EuiFlexItem grow={grow}>{item}</EuiFlexItem>);
  }

  if (end < total) {
    displayItems.push(
      <EuiFlexItem grow={false}>
        <NavigationButton type={'more'} onClick={onMoreClick} />
      </EuiFlexItem>
    );
  }

  return <EuiFlexGrid columns={displayItems.length as FlexGridColumns}>{displayItems}</EuiFlexGrid>;
}
