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
  EuiTable,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiListGroup,
  EuiListGroupItem,
  EuiTitle,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FavoriteStarButton, cssFavoriteHoverWithinTable, cssFavoriteHoverWithinListItem } from './favorite_star_button';
import { FavoritesService } from '../services/favorites_service';

interface ExampleItem {
  id: string;
  title: string;
  type: 'dashboard' | 'saved_search';
}

interface FavoriteStarButtonExampleProps {
  favoritesService: FavoritesService;
}

export const FavoriteStarButtonExample: React.FC<FavoriteStarButtonExampleProps> = ({
  favoritesService,
}) => {
  const { euiTheme } = useEuiTheme();

  const exampleItems: ExampleItem[] = [
    { id: 'dashboard-1', title: 'Sample Dashboard', type: 'dashboard' },
    { id: 'dashboard-2', title: 'Analytics Dashboard', type: 'dashboard' },
    { id: 'search-1', title: 'Error Logs Search', type: 'saved_search' },
    { id: 'search-2', title: 'User Activity Search', type: 'saved_search' },
  ];

  const handleFavoriteChange = (itemId: string, isFavorite: boolean) => {
    console.log(`Item ${itemId} is now ${isFavorite ? 'favorited' : 'unfavorited'}`);
  };

  return (
    <div>
      <EuiTitle size="m">
        <h2>Favorite Star Button Examples</h2>
      </EuiTitle>

      <EuiSpacer size="l" />

      {/* Table Example */}
      <EuiTitle size="s">
        <h3>Table with Hover-to-Show Star Buttons</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiTable
        css={cssFavoriteHoverWithinTable(euiTheme)}
        data-test-subj="favorites-example-table"
      >
        <EuiTableHeader>
          <EuiTableHeaderCell>Title</EuiTableHeaderCell>
          <EuiTableHeaderCell>Type</EuiTableHeaderCell>
          <EuiTableHeaderCell width="60px">Actions</EuiTableHeaderCell>
        </EuiTableHeader>
        <EuiTableBody>
          {exampleItems.map((item) => (
            <EuiTableRow key={item.id}>
              <EuiTableRowCell>{item.title}</EuiTableRowCell>
              <EuiTableRowCell>{item.type}</EuiTableRowCell>
              <EuiTableRowCell>
                <FavoriteStarButton
                  type={item.type}
                  id={item.id}
                  favoritesService={favoritesService}
                  onFavoriteChange={(isFavorite) => handleFavoriteChange(item.id, isFavorite)}
                />
              </EuiTableRowCell>
            </EuiTableRow>
          ))}
        </EuiTableBody>
      </EuiTable>

      <EuiSpacer size="xl" />

      {/* List Example */}
      <EuiTitle size="s">
        <h3>List with Always-Visible Star Buttons</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiListGroup
        css={cssFavoriteHoverWithinListItem(euiTheme)}
        data-test-subj="favorites-example-list"
      >
        {exampleItems.map((item) => (
          <EuiListGroupItem
            key={item.id}
            label={item.title}
            iconType={item.type === 'dashboard' ? 'dashboardApp' : 'search'}
            extraAction={{
              color: 'text',
              onClick: () => {},
              iconType: 'starEmpty',
              'aria-label': 'Favorite',
              alwaysShow: true,
            }}
          >
            <div
              css={css`
                position: absolute;
                right: ${euiTheme.size.s};
                top: 50%;
                transform: translateY(-50%);
              `}
            >
              <FavoriteStarButton
                type={item.type}
                id={item.id}
                favoritesService={favoritesService}
                onFavoriteChange={(isFavorite) => handleFavoriteChange(item.id, isFavorite)}
                alwaysShow={true}
              />
            </div>
          </EuiListGroupItem>
        ))}
      </EuiListGroup>

      <EuiSpacer size="xl" />

      {/* Individual Buttons Example */}
      <EuiTitle size="s">
        <h3>Individual Star Buttons</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <div
        css={css`
          display: flex;
          gap: ${euiTheme.size.m};
          flex-wrap: wrap;
        `}
      >
        {exampleItems.map((item) => (
          <div
            key={item.id}
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.s};
              padding: ${euiTheme.size.s};
              border: 1px solid ${euiTheme.colors.border};
              border-radius: ${euiTheme.border.radius.small};
            `}
          >
            <span>{item.title}</span>
            <FavoriteStarButton
              type={item.type}
              id={item.id}
              favoritesService={favoritesService}
              onFavoriteChange={(isFavorite) => handleFavoriteChange(item.id, isFavorite)}
              alwaysShow={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
