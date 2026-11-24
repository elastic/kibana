/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { formatDuration, formatShare } from '../geometry/ticks';
import type { LatencyMapOperation, OperationBands } from '../operations/operation_bands';

const describeGroups = ({ bands }: OperationBands) =>
  bands
    .map((band) =>
      i18n.translate('traceLatencyMap.durationGroups.group', {
        defaultMessage: '{share} at {minDuration}-{maxDuration}',
        values: {
          share: formatShare(band.share),
          minDuration: formatDuration(band.minDuration),
          maxDuration: formatDuration(band.maxDuration),
        },
      })
    )
    .join(', ');

/**
 * The operations on a mixed map whose durations fall into distinct groups. Picking one
 * narrows the host to it, where its groups are drawn and can be selected.
 */
export function DurationGroupsPicker({
  operations,
  onFocusOperation,
}: {
  operations: OperationBands[];
  onFocusOperation: (operation: LatencyMapOperation) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiPopover
      aria-label={i18n.translate('traceLatencyMap.durationGroups.ariaLabel', {
        defaultMessage: 'Operations with distinct duration groups',
      })}
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj="traceLatencyMapDurationGroups"
        >
          {i18n.translate('traceLatencyMap.durationGroups.button', {
            defaultMessage: 'Duration groups ({count})',
            values: { count: operations.length },
          })}
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        title={i18n.translate('traceLatencyMap.durationGroups.title', {
          defaultMessage: 'Show one operation and its duration groups',
        })}
        items={operations.map((operationBands, index) => {
          const { operation } = operationBands;
          return (
            <EuiContextMenuItem
              key={`${operation.service}\u0000${operation.name}`}
              onClick={() => {
                setIsOpen(false);
                onFocusOperation(operation);
              }}
              data-test-subj={`traceLatencyMapDurationGroup-${index + 1}`}
            >
              <EuiText size="s">
                <strong>{operation.service}</strong> {operation.name}
              </EuiText>
              <EuiText size="xs" color="subdued">
                {describeGroups(operationBands)}
              </EuiText>
            </EuiContextMenuItem>
          );
        })}
      />
    </EuiPopover>
  );
}
