/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, useEuiTheme, EuiImage } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import emptyFavoritesDark from './empty_favorites_dark.svg';
import emptyFavoritesLight from './empty_favorites_light.svg';

export const FavoritesEmptyState = ({
  emptyStateType = 'noItems',
  entityNamePlural = i18n.translate('contentManagement.favorites.defaultEntityNamePlural', {
    defaultMessage: 'items',
  }),
  entityName = i18n.translate('contentManagement.favorites.defaultEntityName', {
    defaultMessage: 'item',
  }),
}: {
  emptyStateType: 'noItems' | 'noMatchingItems';
  entityNamePlural?: string;
  entityName?: string;
}) => {
  const title =
    emptyStateType === 'noItems' ? (
      <FormattedMessage
        id="contentManagement.favorites.noFavoritesMessageHeading"
        defaultMessage="You haven’t starred any {entityNamePlural}"
        values={{ entityNamePlural }}
      />
    ) : (
      <FormattedMessage
        id="contentManagement.favorites.noMatchingFavoritesMessageHeading"
        defaultMessage="No starred {entityNamePlural} match your search"
        values={{ entityNamePlural }}
      />
    );

  return (
    <EuiEmptyPrompt
      css={css`
        .euiEmptyPrompt__icon {
          min-inline-size: 25%; /* reduce the min size of the container to fit more title in a single line* /
        }
      `}
      layout="horizontal"
      color="transparent"
      icon={<NoFavoritesIllustration />}
      hasBorder={false}
      title={<h2>{title}</h2>}
      body={
        <FormattedMessage
          id="contentManagement.favorites.noFavoritesMessageBody"
          defaultMessage="You can easily star {entityNamePlural} to keep them handy. Simply click the star icon next to a {entityName}, and it will be added to your Starred list."
          values={{ entityNamePlural, entityName }}
        />
      }
    />
  );
};

const NoFavoritesIllustration = () => {
  const { colorMode } = useEuiTheme();

  const src = colorMode === 'DARK' ? emptyFavoritesDark : emptyFavoritesLight;

  return (
    <EuiImage
      style={{
        width: 300,
        height: 220,
        objectFit: 'contain',
      }} /* we use fixed width to prevent layout shift */
      src={src}
      alt={i18n.translate('contentManagement.favorites.noFavoritesIllustrationAlt', {
        defaultMessage: 'No starred items illustrations',
      })}
    />
  );
};
