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
  EuiPanel,
  EuiTitle,
  EuiListGroup,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiScreenReaderOnly,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFavoritesPanel } from './hooks';
import { getServices } from '../kibana_services';

export const FavoritesPanel: React.FC = () => {
  const { items, isLoading, error } = useFavoritesPanel();
  const services = getServices();

  const handleItemClick = (link: string) => {
    services.application.navigateToUrl(link);
  };

  const renderPanelContent = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <EuiLoadingSpinner size="m" />
        </div>
      );
    }

    if (error) {
      return (
        <EuiText color="danger" size="s">
          <FormattedMessage
            id="home.contentPanels.favorites.error"
            defaultMessage="Error loading favorites: {errorMessage}"
            values={{ errorMessage: error.message }}
          />
        </EuiText>
      );
    }

    if (items.length === 0) {
      return (
        <EuiEmptyPrompt
          paddingSize="none"
          title={
            <EuiScreenReaderOnly>
              <h3>
                <FormattedMessage
                  id="home.contentPanels.favorites.empty"
                  defaultMessage="Favorites"
                />
              </h3>
            </EuiScreenReaderOnly>
          }
          titleSize="xxs"
          body={
            <EuiText size="s">
              <FormattedMessage
                id="home.contentPanels.favorites.empty"
                defaultMessage="Star items like dashboards and saved searches for quick access"
              />
            </EuiText>
          }
          style={{ maxWidth: '300px' }}
        />
      );
    }

    return (
      <EuiListGroup
        size="s"
        gutterSize="none"
        flush
        listItems={items.map((item) => ({
          label: item.title,
          onClick: () => handleItemClick(item.link),
          'data-test-subj': `favorites-${item.id}`,
          iconType: item.type === 'dashboard' ? 'dashboardApp' : 'discoverApp',
        }))}
      />
    );
  };

  return (
    <EuiPanel
      hasBorder
      color="plain"
      style={{ maxWidth: '400px' }}
      data-test-subj="homeFavoritesPanel"
      paddingSize="m"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="starEmpty" size="l" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="home.contentPanels.favorites.title"
                defaultMessage="Favorites"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      {renderPanelContent()}
    </EuiPanel>
  );
};
