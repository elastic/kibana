/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { IndexPatternField } from '../../../../../data/common/index_patterns/fields/index_pattern_field';
import type { FieldIconProps } from '../../../../../kibana_react/public/field_icon/field_icon';
import { FieldIcon } from '../../../../../kibana_react/public/field_icon/field_icon';
import './field_name.scss';
import { getFieldTypeName } from './field_type_name';

// properties fieldType and fieldName are provided in kbn_doc_view
// this should be changed when both components are deangularized
interface Props {
  fieldName: string;
  fieldType?: string;
  fieldMapping?: IndexPatternField;
  fieldIconProps?: Omit<FieldIconProps, 'type'>;
  scripted?: boolean;
}

export function FieldName({
  fieldName,
  fieldMapping,
  fieldType,
  fieldIconProps,
  scripted = false,
}: Props) {
  const typeName = getFieldTypeName(fieldType);
  const displayName =
    fieldMapping && fieldMapping.displayName ? fieldMapping.displayName : fieldName;
  const tooltip = displayName !== fieldName ? `${fieldName} (${displayName})` : fieldName;
  const isMultiField = !!fieldMapping?.spec?.subType?.multi;

  return (
    <Fragment>
      <EuiFlexItem grow={false} className="kbnDocViewer__fieldIcon">
        <FieldIcon type={fieldType!} label={typeName} scripted={scripted} {...fieldIconProps} />
      </EuiFlexItem>

      <EuiFlexGroup wrap={true} gutterSize="none" responsive={false} alignItems="flexStart">
        <EuiFlexItem className="kbnDocViewer__fieldName eui-textBreakAll" grow={false}>
          <EuiToolTip
            position="top"
            content={tooltip}
            delay="long"
            anchorClassName="eui-textBreakAll"
          >
            <span>{displayName}</span>
          </EuiToolTip>
        </EuiFlexItem>

        {isMultiField && (
          <EuiToolTip
            position="top"
            delay="long"
            content={i18n.translate(
              'discover.fieldChooser.discoverField.multiFieldTooltipContent',
              {
                defaultMessage: 'Multi-fields can have multiple values per field',
              }
            )}
          >
            <EuiBadge
              title=""
              className="kbnDocViewer__multiFieldBadge"
              color="default"
              data-test-subj={`tableDocViewRow-${fieldName}-multifieldBadge`}
            >
              <FormattedMessage
                id="discover.fieldChooser.discoverField.multiField"
                defaultMessage="multi-field"
              />
            </EuiBadge>
          </EuiToolTip>
        )}
      </EuiFlexGroup>
    </Fragment>
  );
}
