/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiPopover,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css, type Theme } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import type { FetchResult, NewsfeedItem } from '../types';
import { NewsEmptyPrompt } from './empty_news';
import { NewsListing } from './listing';
import { NewsLoadingPrompt } from './loading_news';

const categories: NonNullable<NewsfeedItem['category']>[] = ['search', 'observability', 'security'];

const categoryLabels: Record<NonNullable<NewsfeedItem['category']>, string> = {
  search: i18n.translate('newsfeed.flyoutList.searchCategoryLabel', {
    defaultMessage: 'Search Labs',
  }),
  observability: i18n.translate('newsfeed.flyoutList.observabilityCategoryLabel', {
    defaultMessage: 'Observability Labs',
  }),
  security: i18n.translate('newsfeed.flyoutList.securityCategoryLabel', {
    defaultMessage: 'Security Labs',
  }),
};

interface NewsListingWithNewsProps {
  initialCategory?: NewsfeedItem['category'];
  isServerless: boolean;
  newsFetchResult: FetchResult;
}

const NewsListingWithNews: React.FC<NewsListingWithNewsProps> = ({
  initialCategory,
  newsFetchResult,
  isServerless,
}) => {
  const [category, setCategory] = React.useState<NonNullable<NewsfeedItem['category']>>(
    initialCategory ?? 'search'
  );
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  // Divide the results: general items have no category, blog items have a category
  const { feedItems: items } = newsFetchResult;
  const generalItems: NewsfeedItem[] = items.filter(({ category: c }) => !c);
  const filteredItems: NewsfeedItem[] = items.filter(({ category: c }) => c === category);

  const styles = {
    container: ({ euiTheme }: Theme) => css`
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 0 ${euiTheme.size.base};
    `,
    halfContainer: ({ euiTheme }: Theme) => css`
      height: 50%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: ${euiTheme.size.base} 0;
    `,
    panelContainer: css`
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `,
    scrollableContent: ({ euiTheme }: Theme) => css`
      flex: 1;
      overflow-y: auto;
      padding: ${euiTheme.size.base};
    `,
  };

  return (
    <EuiFlexGrid direction="column" gutterSize="none" css={styles.container}>
      {generalItems.length > 0 && (
        <EuiFlexItem css={styles.halfContainer}>
          <EuiFlexGroup
            style={{ flexGrow: 0 }}
            gutterSize="m"
            alignItems="flexEnd"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h1>
                  <FormattedMessage
                    id="newsfeed.flyoutList.generalTitle"
                    defaultMessage="Highlights"
                  />
                </h1>
              </EuiTitle>
            </EuiFlexItem>
            {!isServerless ? (
              <>
                <EuiFlexItem>
                  <EuiText color="subdued" size="s">
                    {newsFetchResult.kibanaVersion}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <EuiLink
                      href="https://www.elastic.co/docs/release-notes"
                      target="_blank"
                      external
                      data-test-subj="newsfeedFlyoutReleaseNotesLink"
                      color="subdued"
                    >
                      <FormattedMessage
                        id="newsfeed.flyoutList.readAllReleaseNotesLinkText"
                        defaultMessage="Read all release notes"
                      />
                    </EuiLink>
                  </EuiText>
                </EuiFlexItem>
              </>
            ) : null}
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiPanel hasBorder paddingSize="none" css={styles.panelContainer}>
            <div css={styles.scrollableContent}>
              <NewsListing feedItems={generalItems} />
            </div>
          </EuiPanel>
        </EuiFlexItem>
      )}

      <EuiFlexItem css={styles.halfContainer}>
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          responsive={false}
          style={{ flexGrow: 0 }}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h1>
                <FormattedMessage
                  id="newsfeed.flyoutList.securityTitle"
                  defaultMessage="{activeCategory} Blogs"
                  values={{
                    activeCategory: categoryLabels[category],
                  }}
                />
              </h1>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  iconType="arrowDown"
                  aria-label={i18n.translate('newsfeed.flyoutList.categoryFilterButtonAriaLabel', {
                    defaultMessage: 'Select news category',
                  })}
                  onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                />
              }
              isOpen={isPopoverOpen}
              closePopover={() => setIsPopoverOpen(false)}
            >
              <EuiListGroup gutterSize="s" flush>
                {categories.map((c) => (
                  <EuiListGroupItem
                    key={c}
                    size="s"
                    onClick={() => {
                      setCategory(c);
                      setIsPopoverOpen(false);
                    }}
                    label={categoryLabels[c]}
                    isActive={category === c}
                  />
                ))}
              </EuiListGroup>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <EuiPanel hasBorder paddingSize="none" css={styles.panelContainer}>
          {filteredItems.length > 0 && (
            <div css={styles.scrollableContent}>
              <NewsListing feedItems={filteredItems} />
            </div>
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};

export interface NewsfeedFlyoutProps extends Partial<Omit<EuiFlyoutProps, 'ref'>> {
  showPlainSpinner: boolean;
  isServerless: boolean;
  newsFetchResult: FetchResult | void | null;
  setFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const NewsfeedFlyout = (props: NewsfeedFlyoutProps) => {
  const { newsFetchResult, setFlyoutVisible, showPlainSpinner, isServerless, ...rest } = props;
  const closeFlyout = useCallback(() => setFlyoutVisible(false), [setFlyoutVisible]);

  const styles = {
    header: ({ euiTheme }: Theme) => css`
      &.euiFlyoutHeader {
        padding-inline: ${euiTheme.size.m};
      }
    `,
    body: css`
      position: relative;
      overflow: hidden;
    `,
  };

  return (
    <EuiPortal>
      <EuiFlyout
        {...rest}
        onClose={closeFlyout}
        size="s"
        aria-labelledby="flyoutSmallTitle"
        className="kbnNews__flyout"
        data-test-subj="NewsfeedFlyout"
      >
        <EuiFlyoutHeader hasBorder css={styles.header}>
          <EuiTitle size="s">
            <h2 id="flyoutSmallTitle">
              <FormattedMessage
                id="newsfeed.flyoutList.whatsNewTitle"
                defaultMessage="What's new at Elastic"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody css={styles.body}>
          {!newsFetchResult ? (
            <NewsLoadingPrompt showPlainSpinner={showPlainSpinner} />
          ) : newsFetchResult.feedItems.length === 0 ? (
            <NewsEmptyPrompt />
          ) : (
            <NewsListingWithNews newsFetchResult={newsFetchResult} isServerless={isServerless} />
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
            <FormattedMessage id="newsfeed.flyoutList.closeButtonLabel" defaultMessage="Close" />
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};
