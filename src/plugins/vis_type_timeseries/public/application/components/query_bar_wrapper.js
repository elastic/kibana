/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useContext } from 'react';
import { CoreStartContext } from '../contexts/query_input_bar_context';
import { QueryStringInput } from '../../../../../plugins/data/public';

export function QueryBarWrapper(props) {
  const coreStartContext = useContext(CoreStartContext);

  return <QueryStringInput {...props} {...coreStartContext} />;
}
