/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AggConfig } from '../../..';
import { Schema } from '../schemas';
import { AggGroupNames } from '../agg_groups';

interface DefaultEditorAggAddProps {
  group?: AggConfig[];
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

  const addButton = (
    <EuiButtonEmpty
      size="xs"
      iconType="plusInCircleFilled"
      data-test-subj={`visEditorAdd_${groupName}`}
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
    >
      <FormattedMessage id="common.ui.vis.editors.aggAdd.addButtonLabel" defaultMessage="Add" />
    </EuiButtonEmpty>
  );

  const groupNameLabel =
    groupName === AggGroupNames.Buckets
      ? i18n.translate('common.ui.vis.editors.aggAdd.bucketLabel', { defaultMessage: 'bucket' })
      : i18n.translate('common.ui.vis.editors.aggAdd.metricLabel', { defaultMessage: 'metric' });

  const isSchemaDisabled = (schema: Schema): boolean => {
    const count = group.filter(agg => agg.schema.name === schema.name).length;
    return count >= schema.max;
  };

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
          <EuiPopoverTitle>
            {(groupName !== AggGroupNames.Buckets || !stats.count) && (
              <FormattedMessage
                id="common.ui.vis.editors.aggAdd.addGroupButtonLabel"
                defaultMessage="Add {groupNameLabel}"
                values={{ groupNameLabel }}
              />
            )}
            {groupName === AggGroupNames.Buckets && stats.count > 0 && (
              <FormattedMessage
                id="common.ui.vis.editors.aggAdd.addSubGroupButtonLabel"
                defaultMessage="Add sub-{groupNameLabel}"
                values={{ groupNameLabel }}
              />
            )}
          </EuiPopoverTitle>
          <EuiContextMenuPanel
            items={schemas.map(schema => (
              <EuiContextMenuItem
                key={`${schema.name}_${schema.title}`}
                data-test-subj={`visEditorAdd_${groupName}_${schema.title}`}
                disabled={isPopoverOpen && isSchemaDisabled(schema)}
                onClick={() => onSelectSchema(schema)}
              >
                {schema.title}
              </EuiContextMenuItem>
            ))}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export { DefaultEditorAggAdd };
