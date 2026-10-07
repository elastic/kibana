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

// The official full-color butler, which reads on both themes. The monochrome
// glyph this replaced is a thin outline that collapses into a smudge at 16px.
import icon from './jenkins.svg';

export default (props: ConnectorIconProps) => {
  return <EuiIcon type={icon} {...props} />;
};
