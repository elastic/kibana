/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPageTemplateProps } from '../types';

export const NO_DATA_PAGE_MAX_WIDTH = 950;

export const NO_DATA_PAGE_TEMPLATE_PROPS: KibanaPageTemplateProps = {
  restrictWidth: NO_DATA_PAGE_MAX_WIDTH,
  template: 'centeredBody',
  pageContentProps: {
    hasShadow: false,
    color: 'transparent',
  },
};
