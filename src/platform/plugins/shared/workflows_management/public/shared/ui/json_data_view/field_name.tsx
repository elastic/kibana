/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiHighlight } from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';
import React, { useMemo } from 'react';
import { Draggable } from '@kbn/dom-drag-drop';
import type { JSONDataTableRecord } from './types';

interface FieldNameProps {
  row: JSONDataTableRecord;
  pathPrefix: string;
  highlight?: string;
}

export function FieldName({ row, pathPrefix, highlight = '' }: FieldNameProps) {
  const fieldName = row.flattened.field;
  const fieldType = row.flattened.fieldType;

  const draggableValue = useMemo(
    () => ({ id: row.id, humanData: { label: `${pathPrefix}.${fieldName}` } }),
    [row.id, pathPrefix, fieldName]
  );

  return (
    <Draggable key={row.id} dragType="move" order={[0]} value={draggableValue}>
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="s"
            responsive={false}
            alignItems="center"
            direction="row"
            wrap={false}
            className="kbnDocViewer__fieldName_icon"
          >
            <EuiFlexItem grow={false}>
              <FieldIcon type={fieldType} size="s" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup
            gutterSize="none"
            responsive={false}
            alignItems="center"
            direction="row"
            wrap
          >
            <EuiFlexItem
              className="kbnDocViewer__fieldName eui-textBreakAll"
              grow={false}
              data-test-subj={`tableDocViewRow-${fieldName}-name`}
            >
              <EuiHighlight search={highlight}>{fieldName}</EuiHighlight>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Draggable>
  );
}
