/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

export function SplitTooltip() {
  return (
    <FormattedMessage
      id="visTypeXy.splitTitle.tooltip"
      defaultMessage="Split chart aggregation is not supported with the new charts library. Please enable the legacy charts library advanced setting to use split chart aggregation."
    />
  );
}
