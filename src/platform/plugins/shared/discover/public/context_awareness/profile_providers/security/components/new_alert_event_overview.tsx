/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DocViewerComponent } from '@kbn/unified-doc-viewer/types';

/**
 * This component is a placeholder for the new alert/event Overview tab content.
 * It will be rendered with the new document profile that is current experimental.
 * The intention keep implementing its content as we're extracting flyout code from the Security Solution plugin to a set of package.
 * The experimental flag will remain true until we're ready to ship some of the content. The target is to release an MVP by 9.4 then have it fully functional by 9.5.
 */
export const NewAlertEventOverview: DocViewerComponent = ({ hit }) => {
  return <></>;
};
