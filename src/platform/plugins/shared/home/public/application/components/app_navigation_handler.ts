/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MouseEvent } from 'react';
import { getServices } from '../kibana_services';

export const createAppNavigationHandler = (targetUrl: string) => (event: MouseEvent) => {
  if (event.altKey || event.metaKey || event.ctrlKey) {
    return;
  }
  const { application, addBasePath } = getServices();
  event.preventDefault();
  application.navigateToUrl(addBasePath(targetUrl));
};
