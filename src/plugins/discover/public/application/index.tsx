/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { ExperimentalFeatures } from '../../common/config';
import { DiscoverRouter } from './discover_router';
import { DiscoverServices } from '../build_services';
import type { DiscoverProfileRegistry } from '../customizations/profile_registry';
import type { DiscoverCustomizationContext } from '../customizations';

export interface RenderAppProps {
  element: HTMLElement;
  services: DiscoverServices;
  profileRegistry: DiscoverProfileRegistry;
  customizationContext: DiscoverCustomizationContext;
  experimentalFeatures: ExperimentalFeatures;
}

const clipboardDataPrefix = 'timerangeData.v1:';

export const renderApp = ({
  element,
  services,
  profileRegistry,
  customizationContext,
  experimentalFeatures,
}: RenderAppProps) => {
  const { history, capabilities, chrome, data, core } = services;

  const onCopy = (eve: ClipboardEvent) => {
    // If the user is actually copying something, ignore it
    if (window.getSelection()?.toString() || !eve.clipboardData) return;
    const activeBounds = services.data.query.timefilter.timefilter.getTime();
    if (!activeBounds) return;

    eve.preventDefault();
    eve.clipboardData.setData('text', `${clipboardDataPrefix}${JSON.stringify(activeBounds)}`);
    core.notifications.toasts.addSuccess({
      title: 'Copied time range to clipboard!',
    });
  };
  const onPaste = (eve: ClipboardEvent) => {
    if (!eve.clipboardData) return;
    const clipboardData = eve.clipboardData.getData('text');
    if (!clipboardData.startsWith(clipboardDataPrefix)) return;

    const bounds = JSON.parse(clipboardData.slice(clipboardDataPrefix.length));
    services.data.query.timefilter.timefilter.setTime(bounds);
    core.notifications.toasts.addSuccess({
      title: 'Pasted time range!',
    });
  };
  element.addEventListener('copy', onCopy);
  element.addEventListener('paste', onPaste);

  if (!capabilities.discover.save) {
    chrome.setBadge({
      text: i18n.translate('discover.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('discover.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save searches',
      }),
      iconType: 'glasses',
    });
  }
  const unmount = toMountPoint(
    <DiscoverRouter
      services={services}
      profileRegistry={profileRegistry}
      customizationContext={customizationContext}
      experimentalFeatures={experimentalFeatures}
      history={history}
    />,
    {
      theme: core.theme,
      i18n: core.i18n,
    }
  )(element);

  return () => {
    unmount();
    element.removeEventListener('copy', onCopy);
    element.removeEventListener('paste', onPaste);
    data.search.session.clear();
  };
};
