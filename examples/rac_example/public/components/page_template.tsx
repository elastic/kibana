/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';
import type { LazyObservabilityPageTemplateProps } from '../../../../x-pack/plugins/observability/public';

export const PageTemplate: React.FC<LazyObservabilityPageTemplateProps> = (pageTemplateProps) => {
  const {
    services: {
      observability: {
        navigation: { PageTemplate: Template },
      },
    },
  } = useKibanaContextForPlugin();

  return <Template {...pageTemplateProps} />;
};
