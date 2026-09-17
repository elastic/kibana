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
import { createCommentsHostServices } from './host_services';

/** The comments layer with Kibana as its host; loaded by `CommentsLauncher` on first use. */
export const CommentsItem = ({
  core,
  initialActive = false,
}: {
  core: CoreStart;
  initialActive?: boolean;
}) => {
  const services = useMemo(() => createCommentsHostServices(core), [core]);
  return <CommentsButton services={services} initialActive={initialActive} />;
};
