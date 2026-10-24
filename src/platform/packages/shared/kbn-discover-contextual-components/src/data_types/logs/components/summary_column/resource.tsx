/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CommonProps } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { ResourceFieldDescriptor, RenderResourceBadge } from './utils';

const MAX_LIMITED_FIELDS_VISIBLE = 3;

interface ResourceProps {
  fields: ResourceFieldDescriptor[];
  /* When true, the column will render a predefined number of resources and indicates with a badge how many more we have */
  limited?: boolean;
  onFilter?: DocViewFilterFn;
  row?: DataTableRecord;
  renderResourceBadge?: RenderResourceBadge;
  css?: CommonProps['css'];
}

export const Resource = ({
  fields,
  limited = false,
  onFilter,
  row,
  renderResourceBadge,
  ...props
}: ResourceProps) => {
  const displayedFields = limited ? fields.slice(0, MAX_LIMITED_FIELDS_VISIBLE) : fields;
  const extraFieldsCount = limited ? fields.length - MAX_LIMITED_FIELDS_VISIBLE : 0;

  return (
    <EuiFlexGroup gutterSize="s" {...props}>
      {displayedFields.map((field) => {
        const { name, rawValue, formattedValue, textValue, ResourceBadge, Icon, property } = field;
        const customBadge = row ? renderResourceBadge?.({ field, row }) : undefined;

        return (
          <React.Fragment key={name}>
            {customBadge ?? (
              <ResourceBadge
                name={name}
                property={property}
                rawValue={rawValue}
                formattedValue={formattedValue}
                textValue={textValue}
                icon={Icon}
                onFilter={onFilter}
                truncateTitle={true}
              />
            )}
          </React.Fragment>
        );
      })}
      {extraFieldsCount > 0 && (
        <div>
          <EuiBadge>+{extraFieldsCount}</EuiBadge>
        </div>
      )}
    </EuiFlexGroup>
  );
};
