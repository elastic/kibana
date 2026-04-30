/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { trace } from '@opentelemetry/api';
import type { AttributeValue } from '@opentelemetry/api';
import apm from 'elastic-apm-node';

export type Labels = Record<string, string | number | boolean | null | undefined>;

interface AddLabelsOptions {
  otelAttributes?: Record<string, AttributeValue>;
  isString?: boolean;
}

export const prefixKeys = (labels: Labels, prefix: string): Record<string, AttributeValue> =>
  Object.fromEntries(
    Object.entries(labels)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [`${prefix}${k}`, v as AttributeValue])
  );

export const addSpanLabels = (labels: Labels, opts?: AddLabelsOptions): void => {
  apm.addLabels(labels, opts?.isString);
  const span = trace.getActiveSpan();
  if (span && span.isRecording()) {
    span.setAttributes(opts?.otelAttributes ?? prefixKeys(labels, 'kibana.'));
  }
};

export const addTransactionLabels = (labels: Labels, opts?: AddLabelsOptions): void => {
  apm.currentTransaction?.addLabels(labels, opts?.isString);
  const span = trace.getActiveSpan();
  if (span && span.isRecording()) {
    span.setAttributes(opts?.otelAttributes ?? prefixKeys(labels, 'kibana.'));
  }
};
