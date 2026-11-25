/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { CommentsButton } from '@kbn/dev-comments';
import { useI18n } from '@kbn/i18n-react';
import { createCommentsHostServices } from './host_services';

export const CommentsItem = ({ core }: { core: CoreStart }) => {
  // Core's intl context: dates format in Kibana's locale.
  const intl = useI18n();
  const services = useMemo(() => createCommentsHostServices(core, intl), [core, intl]);
  return <CommentsButton services={services} />;
};
