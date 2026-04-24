/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { MAX_DIMENSIONS_SELECTIONS } from '../../../common/constants';

/**
 * Plain message announcing that the user has hit the maximum number of
 * dimensions. Rendered both inside the popover tooltip overlay (per-option)
 * and as the button-level tooltip.
 */
export const MaxDimensionsWarning = () => (
  <FormattedMessage
    id="metricsExperience.dimensionsSelector.maxDimensionsWarning"
    defaultMessage="Maximum of {maxDimensions} dimensions selected"
    values={{ maxDimensions: MAX_DIMENSIONS_SELECTIONS }}
  />
);
