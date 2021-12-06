/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { IAggConfig, AggGroupNames } from '../../../data/public';
import type { Schema } from '../../../visualizations/public';

interface DefaultEditorAggAddProps {
  group?: IAggConfig[];
  groupName: string;
  schemas: Schema[];
  stats: {
    max: number;
    count: number;
  };
  addSchema(schema: Schema): void;
}

function DefaultEditorAggAdd({
  group = [],
  groupName,
  schemas,
  addSchema,
  stats,
}: DefaultEditorAggAddProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onSelectSchema = (schema: Schema) => {
    setIsPopoverOpen(false);
    addSchema(schema);
  };

  const groupNameLabel =
    groupName === AggGroupNames.Buckets
      ? i18n.translate('visDefaultEditor.aggAdd.bucketLabel', { defaultMessage: 'bucket' })
      : i18n.translate('visDefaultEditor.aggAdd.metricLabel', { defaultMessage: 'metric' });

  const addButton = (
    <EuiButtonEmpty
      size="s"
      iconType="plusInCircleFilled"
      data-test-subj={`visEditorAdd_${groupName}`}
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      aria-label={i18n.translate('visDefaultEditor.aggAdd.addGroupButtonLabel', {
        defaultMessage: 'Add {groupNameLabel}',
        values: { groupNameLabel },
      })}
    >
      <FormattedMessage id="visDefaultEditor.aggAdd.addButtonLabel" defaultMessage="Add" />
    </EuiButtonEmpty>
  );

  const isMaxedCount = (schema: Schema): boolean => {
    const count = group.filter((agg) => agg.schema === schema.name).length;
    return count >= schema.max;
  };
  const isSchemaDisabled = (schema: Schema, maxedCount: boolean): boolean => {
    return schema.disabled ?? maxedCount;
  };
  const maxTooltipText = i18n.translate('visDefaultEditor.aggAdd.maxBuckets', {
    defaultMessage: 'Max {groupNameLabel} count reached',
    values: { groupNameLabel },
  });

  return (
    <EuiFlexGroup justifyContent="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiPopover
          id={`addGroupButtonPopover_${groupName}`}
          button={addButton}
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
          repositionOnScroll={true}
          closePopover={() => setIsPopoverOpen(false)}
        >
          <EuiPopoverTitle paddingSize="s">
            {(groupName !== AggGroupNames.Buckets || !stats.count) && (
              <FormattedMessage
                id="visDefaultEditor.aggAdd.addGroupButtonLabel"
                defaultMessage="Add {groupNameLabel}"
                values={{ groupNameLabel }}
              />
            )}
            {groupName === AggGroupNames.Buckets && stats.count > 0 && (
              <FormattedMessage
                id="visDefaultEditor.aggAdd.addSubGroupButtonLabel"
                defaultMessage="Add sub-{groupNameLabel}"
                values={{ groupNameLabel }}
              />
            )}
          </EuiPopoverTitle>
          <EuiContextMenuPanel
            items={schemas.map((schema) => {
              const maxedCount = isMaxedCount(schema);

              return (
                <EuiContextMenuItem
                  key={`${schema.name}_${schema.title}`}
                  data-test-subj={`visEditorAdd_${groupName}_${schema.title}`}
                  disabled={isPopoverOpen && isSchemaDisabled(schema, maxedCount)}
                  onClick={() => onSelectSchema(schema)}
                  toolTipContent={schema.tooltip ?? (maxedCount ? maxTooltipText : undefined)}
                >
                  {schema.title}
                </EuiContextMenuItem>
              );
            })}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export { DefaultEditorAggAdd };
