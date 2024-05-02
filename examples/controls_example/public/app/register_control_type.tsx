/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import { ControlRenderer } from '../controls/control_renderer';
import { SEARCH_CONTROL_TYPE } from '../controls/search_control/types';

export const RegisterControlType = () => {
  return <ControlRenderer type={SEARCH_CONTROL_TYPE} state={{ searchString: 'test' }} />;
};
