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
import { AnnotationsButton } from '@kbn/ui-annotations';
import { createAnnotationsHostServices } from './host_services';

/** The annotations layer with Kibana as its host; loaded by `AnnotationsLauncher` on first use. */
export const AnnotationsItem = ({
  core,
  initialActive = false,
}: {
  core: CoreStart;
  initialActive?: boolean;
}) => {
  const services = useMemo(() => createAnnotationsHostServices(core), [core]);
  return <AnnotationsButton services={services} initialActive={initialActive} />;
};
