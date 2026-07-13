/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  UserAvatarTip,
  ManagedAvatarTip,
  NoCreatorTip,
} from '@kbn/content-management-user-profiles';
import { FavoriteButton } from '@kbn/content-management-favorites-public';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

import { useServices } from '../services';
import type { Tag } from '../types';
import type { TableListViewTableProps } from '../table_list_view_table';
import { UpdatedAtField } from './updated_at_field';
import { TagBadge } from './tag_badge';

const escapeRegExp = (text: string) => text.replace(/[-\[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

/**
 * Dashboards don't carry real thumbnails, so we derive a stable, pleasant
 * gradient from the item id to give each card a distinct "cover".
 */
const coverGradient = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 65%, 88%) 0%, hsl(${h2}, 70%, 78%) 100%)`;
};

interface Props<T extends UserContentCommonSchema> {
  items: T[];
  searchTerm: string;
  id: string;
  isFavoritesEnabled: boolean;
  createdByEnabled: boolean;
  entityName: string;
  hasUpdatedAtMetadata: boolean;
  getDetailViewLink: TableListViewTableProps<T>['getDetailViewLink'];
  getOnClickTitle: TableListViewTableProps<T>['getOnClickTitle'];
  onClickTag: (tag: Tag, isCtrlKey: boolean) => void;
}

export function CardGrid<T extends UserContentCommonSchema>({
  items,
  searchTerm,
  id,
  isFavoritesEnabled,
  createdByEnabled,
  entityName,
  hasUpdatedAtMetadata,
  getDetailViewLink,
  getOnClickTitle,
  onClickTag,
}: Props<T>) {
  const { euiTheme } = useEuiTheme();
  const { TagList, itemHasTags, DateFormatterComp, isKibanaVersioningEnabled } = useServices();

  const renderCard = useCallback(
    (item: T) => {
      const {
        id: itemId,
        references,
        attributes: { title, description },
      } = item;

      const href = getDetailViewLink?.(item);
      const onClickTitle = getOnClickTitle?.(item);

      const onClickHandler =
        onClickTitle && !href
          ? ((e) => {
              e.preventDefault();
              onClickTitle();
            }) as React.MouseEventHandler<HTMLAnchorElement>
          : undefined;

      const titleNode =
        !href && !onClickTitle ? (
          <span>{title}</span>
        ) : (
          <EuiLink
            href={href}
            onClick={onClickHandler}
            data-test-subj={`${id}ListingTitleLink-${title.split(' ').join('-')}`}
          >
            <EuiHighlight highlightAll search={escapeRegExp(searchTerm)}>
              {title}
            </EuiHighlight>
          </EuiLink>
        );

      return (
        <EuiFlexItem key={itemId}>
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="none"
            css={css`
              overflow: hidden;
              height: 100%;
              transition: transform ${euiTheme.animation.fast} ease,
                box-shadow ${euiTheme.animation.fast} ease,
                border-color ${euiTheme.animation.fast} ease;
              &:hover,
              &:focus-within {
                transform: translateY(-2px);
                box-shadow: ${euiTheme.size.xs} ${euiTheme.size.xs} ${euiTheme.size.l} rgba(0, 0, 0, 0.08);
                border-color: ${euiTheme.colors.primary};
              }
            `}
          >
            {/* Cover / thumbnail */}
            <div
              css={css`
                position: relative;
                height: 116px;
                background: ${coverGradient(itemId)};
                display: flex;
                align-items: center;
                justify-content: center;
              `}
            >
              <EuiIcon
                type="dashboardApp"
                size="xl"
                css={css`
                  opacity: 0.55;
                  transform: scale(1.6);
                `}
              />
              {isFavoritesEnabled && (
                <div
                  css={css`
                    position: absolute;
                    top: ${euiTheme.size.xs};
                    right: ${euiTheme.size.xs};
                    background: ${euiTheme.colors.emptyShade};
                    border-radius: 50%;
                    line-height: 0;
                  `}
                >
                  <FavoriteButton id={itemId} />
                </div>
              )}
            </div>

            {/* Body */}
            <div
              css={css`
                padding: ${euiTheme.size.base};
              `}
            >
              <EuiText size="s">
                <strong>{titleNode}</strong>
              </EuiText>

              {Boolean(description) && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText
                    size="xs"
                    color="subdued"
                    css={css`
                      display: -webkit-box;
                      -webkit-line-clamp: 2;
                      -webkit-box-orient: vertical;
                      overflow: hidden;
                    `}
                  >
                    <EuiHighlight highlightAll search={escapeRegExp(searchTerm)}>
                      {description!}
                    </EuiHighlight>
                  </EuiText>
                </>
              )}

              {itemHasTags(references) && (
                <>
                  <EuiSpacer size="s" />
                  <TagList
                    references={references}
                    tagRender={(tag) => (
                      <TagBadge key={tag.name} tag={tag} onClick={onClickTag} />
                    )}
                  />
                </>
              )}

              <EuiSpacer size="m" />

              {/* Footer meta */}
              <EuiFlexGroup
                responsive={false}
                alignItems="center"
                gutterSize="s"
                justifyContent="spaceBetween"
              >
                <EuiFlexItem grow={false}>
                  {createdByEnabled &&
                    (item.createdBy ? (
                      <UserAvatarTip uid={item.createdBy} />
                    ) : item.managed ? (
                      <ManagedAvatarTip entityName={entityName} />
                    ) : (
                      <NoCreatorTip includeVersionTip={isKibanaVersioningEnabled} />
                    ))}
                </EuiFlexItem>
                {hasUpdatedAtMetadata && (
                  <EuiFlexItem grow={false}>
                    <EuiTextColor color="subdued">
                      <EuiText size="xs">
                        <EuiToolTip
                          content={i18n.translate(
                            'contentManagement.tableList.cardGrid.lastUpdatedLabel',
                            { defaultMessage: 'Last updated' }
                          )}
                        >
                          <UpdatedAtField
                            dateTime={item.updatedAt}
                            DateFormatterComp={DateFormatterComp}
                          />
                        </EuiToolTip>
                      </EuiText>
                    </EuiTextColor>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </div>
          </EuiPanel>
        </EuiFlexItem>
      );
    },
    [
      euiTheme,
      id,
      searchTerm,
      isFavoritesEnabled,
      createdByEnabled,
      isKibanaVersioningEnabled,
      entityName,
      hasUpdatedAtMetadata,
      DateFormatterComp,
      getDetailViewLink,
      getOnClickTitle,
      onClickTag,
      TagList,
      itemHasTags,
    ]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={4} gutterSize="l" data-test-subj="cardGridView">
        {items.map(renderCard)}
      </EuiFlexGrid>
    </>
  );
}
