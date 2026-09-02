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
// Transparent PNG of the same artwork the JPEG carried: the JPEG's white matte
// showed as a light tile on dark surfaces. Green reads on both themes, and the
// eyes stay knocked out in white as the mark intends.
import icon from './alienvault.png';

export default (props: ConnectorIconProps) => {
  return <EuiIcon type={icon} {...props} />;
};
