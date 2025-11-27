/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState } from 'react';
import createContainer from 'constate';
import { TraceDataState } from '../../../../../../../x-pack/solutions/observability/plugins/apm/public/components/shared/trace_waterfall/use_trace_waterfall';

/**
 * Hook that manages trace state as a string
 */
const useTraceState = () => {
  const [traceState, setTraceState] = useState<TraceDataState>(TraceDataState.Empty);

  return {
    traceState,
    setTraceState,
  };
};

export const [TraceStateProvider, useTraceStateContext] = createContainer(useTraceState);
