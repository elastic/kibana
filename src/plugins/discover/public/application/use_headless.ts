/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useLocation } from 'react-router-dom';
import { encode } from '@kbn/rison';
import { useDiscoverServices } from '../hooks/use_discover_services';

// Pass these via config or?
const timelineSearchParams = {
  isOpen: 'true',
  activeTab: 'discover',
};

export const useHeadlessRoutes = (config) => {
  const { application } = useDiscoverServices();
  const { headlessLocation } = config;
  const location = useLocation();
  if (headlessLocation) {
    const { hash, search } = location;
    const currentSearchParams = new URLSearchParams(search);
    currentSearchParams.set('timeline', encode(timelineSearchParams));
    const searchString = decodeURIComponent(currentSearchParams.toString());
    const pathWithSearchAndHash = hash ? `?${searchString}#${hash}` : `?${searchString}`;
    const newUrl = application.getUrlForApp(headlessLocation, {
      deepLinkId: 'alerts',
      path: pathWithSearchAndHash,
    });
    application.navigateToUrl(newUrl);
  }
};
