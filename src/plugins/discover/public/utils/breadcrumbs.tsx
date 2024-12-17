/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiPopover, copyToClipboard } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { omit } from 'lodash';
import { DiscoverStateContainer } from '..';
import type { DiscoverAppLocatorParams } from '../../common';
import type { DiscoverServices } from '../build_services';

const rootPath = '#/';

function getRootBreadcrumbs({ breadcrumb }: { breadcrumb?: string }): ChromeBreadcrumb[] {
  return [
    {
      text: i18n.translate('discover.rootBreadcrumb', {
        defaultMessage: 'Discover',
      }),
      deepLinkId: 'discover',
      href: breadcrumb || rootPath,
    },
  ];
}

/**
 * Helper function to set the Discover's breadcrumb
 * if there's an active savedSearch, its title is appended
 */
export function setBreadcrumbs({
  rootBreadcrumbPath,
  titleBreadcrumbText,
  services,
  state,
}: {
  rootBreadcrumbPath?: string;
  titleBreadcrumbText?: string;
  services: DiscoverServices;
  state?: DiscoverStateContainer;
}) {
  const rootBreadcrumbs = getRootBreadcrumbs({
    breadcrumb: rootBreadcrumbPath,
  });
  const discoverBreadcrumbsTitle = i18n.translate('discover.discoverBreadcrumbTitle', {
    defaultMessage: 'Discover',
  });

  if (titleBreadcrumbText) {
    services.chrome.setBreadcrumbs([...rootBreadcrumbs, { text: titleBreadcrumbText }]);
  } else {
    services.chrome.setBreadcrumbs([
      {
        text: discoverBreadcrumbsTitle,
      },
    ]);
  }
  if (state) {
    services.chrome.setBreadcrumbsAppendExtension({
      content: toMountPoint(
        <>
          <LinkButton services={services} state={state} />
        </>,
        services
      ),
    });
  }
}

const LinkButton = ({
  services,
  state,
}: {
  services: DiscoverServices;
  state: DiscoverStateContainer;
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  return (
    <EuiPopover
      isOpen={linkCopied}
      closePopover={() => setLinkCopied(false)}
      button={
        <EuiButtonIcon
          iconType="link"
          color={linkCopied ? 'success' : 'text'}
          style={{ marginLeft: '2px' }}
          onClick={() => {
            getShareLink({ services, state }).then(async (res) => {
              let link = '';
              setLinkCopied(true);
              if (!services.share) return;
              if (services.capabilities.discover.createShortUrl) {
                const shortUrls = services.share.url.shortUrls.get(null);
                const shortUrl = await shortUrls.createWithLocator({
                  locator: res.locator,
                  params: { url: res.shareableUrl },
                });
                link = await shortUrl.locator.getUrl(shortUrl.params, { absolute: true });
                copyToClipboard(link);
              } else {
                copyToClipboard(res.shareableUrl);
              }
              setTimeout(() => setLinkCopied(false), 2000);
            });
          }}
        >
          Link was copied to clipboard
        </EuiButtonIcon>
      }
    />
  );
};

export async function getShareLink({
  services,
  state,
}: {
  services: DiscoverServices;
  state: DiscoverStateContainer;
}) {
  const savedSearch = state.savedSearchState.getState();
  const dataView = state.internalState.getState().dataView;

  const { locator } = services;
  const appState = state.appState.getState();
  const { timefilter } = services.data.query.timefilter;
  const timeRange = timefilter.getTime();
  const refreshInterval = timefilter.getRefreshInterval();
  const filters = services.filterManager.getFilters();

  // Share -> Get links -> Snapshot
  const params: DiscoverAppLocatorParams = {
    ...omit(appState, 'dataSource'),
    ...(savedSearch.id ? { savedSearchId: savedSearch.id } : {}),
    ...(dataView?.isPersisted()
      ? { dataViewId: dataView?.id }
      : { dataViewSpec: dataView?.toMinimalSpec() }),
    filters,
    timeRange,
    refreshInterval,
  };
  const relativeUrl = locator.getRedirectUrl(params);

  // This logic is duplicated from `relativeToAbsolute` (for bundle size reasons). Ultimately, this should be
  // replaced when https://github.com/elastic/kibana/issues/153323 is implemented.
  const link = document.createElement('a');
  link.setAttribute('href', relativeUrl);
  return Promise.resolve({
    shareableUrl: link.href,
    locator,
  });
}
