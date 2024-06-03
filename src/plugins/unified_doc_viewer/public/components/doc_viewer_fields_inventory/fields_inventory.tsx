/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import {
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTextBlockTruncate,
} from '@elastic/eui';
import { FieldIcon } from '@kbn/field-utils';
import { getUnifiedDocViewerServices } from '../../plugin';

export function FieldsInventory({ columns, hit, onAddColumn, onRemoveColumn }: DocViewRenderProps) {
  const flattenedDoc = hit.flattened;
  const {
    fieldsMetadata: { useFieldsMetadata },
  } = getUnifiedDocViewerServices();

  const { fieldsMetadata = {} } = useFieldsMetadata({
    fieldNames: Object.keys(flattenedDoc),
  });

  if (Object.values(fieldsMetadata).length === 0) {
    return <>There are no knows fields in the document</>;
  }

  return (
    <>
      <EuiSpacer />
      <EuiFlexGrid gutterSize="s" columns={1}>
        {Object.values(fieldsMetadata)
          .filter((rec) => rec.flat_name && hit.flattened && Boolean(hit.flattened[rec.flat_name]))
          .map((rec) => (
            <EuiFlexItem>
              <EuiCard
                layout="horizontal"
                icon={<FieldIcon size="m" type={rec.type!} />}
                titleSize="xs"
                title={rec.flat_name!}
                description={
                  <>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{rec.description}</p>
                    {flattenedDoc && rec.flat_name && Boolean(flattenedDoc[rec.flat_name]) && (
                      <p>
                        <EuiPanel hasBorder={false} color="subdued" hasShadow={false}>
                          <b>Value:</b>
                          <EuiTextBlockTruncate lines={3}>
                            {flattenedDoc[rec.flat_name]}
                          </EuiTextBlockTruncate>
                        </EuiPanel>
                      </p>
                    )}
                  </>
                }
                selectable={
                  rec.flat_name && onRemoveColumn && onAddColumn
                    ? {
                        onClick: columns?.includes(rec.flat_name!)
                          ? () => onRemoveColumn(rec.flat_name!)
                          : () => onAddColumn(rec.flat_name!),
                        isSelected: columns?.includes(rec.flat_name!),
                      }
                    : undefined
                }
              />
            </EuiFlexItem>
          ))}
      </EuiFlexGrid>
    </>
  );
}
