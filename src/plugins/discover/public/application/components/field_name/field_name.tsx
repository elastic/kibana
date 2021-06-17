/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { FieldIcon, FieldIconProps } from '../../../../../kibana_react/public';
import { getFieldTypeName } from './field_type_name';
import { IndexPatternField } from '../../../../../data/public';

// properties fieldType and fieldName are provided in kbn_doc_view
// this should be changed when both components are deangularized
interface Props {
  fieldName: string;
  fieldType: string;
  fieldMapping?: IndexPatternField;
  fieldIconProps?: Omit<FieldIconProps, 'type'>;
  scripted?: boolean;
  className?: string;
}

export function FieldName({
  fieldName,
  fieldMapping,
  fieldType,
  fieldIconProps,
  className,
  scripted = false,
}: Props) {
  const typeName = getFieldTypeName(fieldType);
  const displayName =
    fieldMapping && fieldMapping.displayName ? fieldMapping.displayName : fieldName;
  const tooltip = displayName !== fieldName ? `${fieldName} (${displayName})` : fieldName;
  const isMultiField = !!fieldMapping?.spec?.subType?.multi;

  return (
    <EuiFlexGroup className={className} alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <FieldIcon type={fieldType} label={typeName} scripted={scripted} {...fieldIconProps} />
      </EuiFlexItem>
      <EuiFlexItem className="eui-textTruncate" grow={false}>
        <EuiToolTip
          position="top"
          content={tooltip}
          delay="long"
          anchorClassName="eui-textTruncate"
        >
          <span>{displayName}</span>
        </EuiToolTip>
      </EuiFlexItem>
      {isMultiField && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="top"
            content={i18n.translate(
              'discover.fieldChooser.discoverField.multiFieldTooltipContent',
              {
                defaultMessage: 'Multifields can have multiple values per field',
              }
            )}
          >
            <EuiBadge
              title=""
              className="dscMultiFieldBadge"
              color="default"
              data-test-subj={`tableDocViewRow-${fieldName}-multifieldBadge`}
            >
              <FormattedMessage
                id="discover.fieldChooser.discoverField.multiField"
                defaultMessage="multifield"
              />
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
