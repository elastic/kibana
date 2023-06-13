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

export const createHomeBreadcrumb = ({
  homeHref,
}: {
  homeHref: string;
}): ChromeProjectBreadcrumb => {
  return {
    text: <EuiIcon type="home" />,
    title: 'Home',
    href: homeHref,
  };
};
