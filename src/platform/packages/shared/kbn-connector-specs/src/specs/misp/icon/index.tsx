/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiIcon } from '@elastic/eui';
import type { ConnectorIconProps } from '../../../types';
// Cropped mark from https://www.misp-project.org/img/logo.png (wordmark dropped
// so the cyan knot still reads at connector size). Multi-color PNG — no
// createBrandIcon theme flip; teal reads on light and dark surfaces.
import mispIcon from './misp.png';

export default (props: ConnectorIconProps) => {
  return <EuiIcon type={mispIcon} {...props} />;
};
