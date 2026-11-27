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
import { LatencyMap } from './latency_map';
import type { LatencyMapProps } from './latency_map';
import type { LatencyMapSelection } from '../types';
import type { LatencyMapOperation } from '../operations/operation_bands';
import {
  bimodal,
  bimodalSlow,
  createFakeRunEsql,
  failureBurst,
  movingMode,
  sparseOutliers,
} from './__fixtures__/fake_run_esql';
import type { FakeOperation, Pattern } from './__fixtures__/fake_run_esql';

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

/** Two operations with distinct duration groups: the picker offers them, picking narrows. */
const MIXED_OPERATIONS: FakeOperation[] = [
  { service: 'cart', name: 'GET /cart', pattern: bimodal },
  { service: 'checkout', name: 'POST /checkout', pattern: bimodalSlow },
];

/**
 * A host with the operations feature: focusing writes the operation's condition into the
 * source, as Discover writes it into the ES|QL query, so the map reloads narrowed.
 */
function OperationsHost({
  operations,
  initialFocus,
}: {
  operations: FakeOperation[];
  initialFocus?: LatencyMapOperation;
}) {
  const [focused, setFocused] = useState<
    { operation: LatencyMapOperation; condition?: string } | undefined
  >(initialFocus && { operation: initialFocus });
  const runEsql = useMemo(() => createFakeRunEsql({ pattern: bimodal, operations }), [operations]);
  const [selection, setSelection] = useState<LatencyMapSelection>();
  const [condition, setCondition] = useState<string>();
  const source = useMemo(
    () => (focused?.condition ? { ...SOURCE, filters: [focused.condition] } : SOURCE),
    [focused]
  );
  return (
    <div style={{ maxWidth: 960 }}>
      <LatencyMap
        source={source}
        runEsql={runEsql}
        selection={selection}
        onSelectionCommit={(next, esql) => {
          setSelection(next);
          setCondition(esql);
        }}
        onFocusOperation={(operation, esqlCondition) =>
          setFocused({ operation, condition: esqlCondition })
        }
        focusedOperation={focused?.operation}
        onClearOperation={() => setFocused(undefined)}
        timeZone="UTC"
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
export const MixedOperations: StoryFn = () => <OperationsHost operations={MIXED_OPERATIONS} />;
export const FocusedOperation: StoryFn = () => (
  <OperationsHost
    operations={[MIXED_OPERATIONS[0]]}
    initialFocus={{ service: 'cart', name: 'GET /cart' }}
  />
);
