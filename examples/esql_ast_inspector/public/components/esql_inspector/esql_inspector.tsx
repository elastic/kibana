/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EsqlInspectorState } from './esql_inspector_state';
import { context } from './context';
import { EsqlInspectorConnected } from './esql_inspector_connected';

export interface EsqlInspectorProps {
  state?: EsqlInspectorState;
}

export const EsqlInspector: React.FC<EsqlInspectorProps> = (props) => {
  const state = React.useMemo(() => {
    return props.state ?? new EsqlInspectorState();
  }, [props.state]);

  return (
    <context.Provider value={state}>
      <EsqlInspectorConnected />
    </context.Provider>
  );
};
