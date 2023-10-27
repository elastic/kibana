/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeProjectBreadcrumb } from '@kbn/core-chrome-browser';
import { EuiIcon } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export const createHomeBreadcrumb = ({
  homeHref,
}: {
  homeHref: string;
}): ChromeProjectBreadcrumb => {
  return {
    text: <EuiIcon type="home" />,
    title: i18n.translate('core.ui.chrome.breadcrumbs.homeLink', { defaultMessage: 'Home' }),
    href: homeHref,
    'data-test-subj': 'breadcrumb-home',
  };
};
