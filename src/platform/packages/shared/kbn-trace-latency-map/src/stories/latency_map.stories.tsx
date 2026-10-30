/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import type { Meta, StoryFn } from '@storybook/react';
import { LatencyMap } from '../components/latency_map';
import type { LatencyMapProps } from '../components/latency_map';
import type { LatencyMapSelection } from '../types';
import {
  bimodal,
  createFakeRunEsql,
  failureBurst,
  movingMode,
  sparseOutliers,
} from './fake_run_esql';
import type { Pattern } from './fake_run_esql';

const SOURCE = {
  timeRange: { from: '2026-10-26T10:00:00.000Z', to: '2026-10-26T11:00:00.000Z' },
};

export default {
  title: 'shared/TraceLatencyMap',
  component: LatencyMap,
} as Meta;

/** The map is controlled: the host keeps the selection and shows what it did with it. */
function Host({
  pattern,
  runEsqlOptions,
  ...props
}: Partial<LatencyMapProps> & {
  pattern: Pattern;
  runEsqlOptions?: { spans?: number; fail?: boolean; delayMs?: number };
}) {
  const runEsql = useMemo(
    () => createFakeRunEsql({ pattern, ...runEsqlOptions }),
    [pattern, runEsqlOptions]
  );
  const [selection, setSelection] = useState<LatencyMapSelection>();
  const [condition, setCondition] = useState<string>();
  return (
    <div style={{ maxWidth: 960 }}>
      <LatencyMap
        source={SOURCE}
        runEsql={runEsql}
        selection={selection}
        onSelectionCommit={(next, esql) => {
          setSelection(next);
          setCondition(esql);
        }}
        timeZone="UTC"
        {...props}
      />
      <EuiSpacer />
      <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
        {condition ?? '// Draw a region on the map to get its ES|QL condition.'}
      </EuiCodeBlock>
    </div>
  );
}

export const Bimodal: StoryFn = () => <Host pattern={bimodal} />;
export const MovingMode: StoryFn = () => <Host pattern={movingMode} />;
export const FailureBurst: StoryFn = () => <Host pattern={failureBurst} />;
export const SparseOutliers: StoryFn = () => <Host pattern={sparseOutliers} />;
export const Traces: StoryFn = () => <Host pattern={bimodal} unit="traces" />;
export const Sampled: StoryFn = () => (
  <Host pattern={bimodal} runEsqlOptions={{ spans: 2_000_000 }} />
);
export const Tall: StoryFn = () => <Host pattern={bimodal} height={320} />;
export const Empty: StoryFn = () => <Host pattern={bimodal} runEsqlOptions={{ spans: 0 }} />;
export const Error: StoryFn = () => <Host pattern={bimodal} runEsqlOptions={{ fail: true }} />;
export const Loading: StoryFn = () => (
  <Host pattern={bimodal} runEsqlOptions={{ delayMs: 3_600_000 }} />
);
