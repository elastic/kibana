/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import './field_name.scss';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiHighlight } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FieldIcon, FieldIconProps } from '@kbn/react-field';
import { type DataViewField, getFieldSubtypeMulti } from '@kbn/data-views-plugin/public';
import { getFieldTypeName } from '@kbn/unified-field-list-plugin/public';

interface Props {
  fieldName: string;
  fieldType?: string;
  fieldMapping?: DataViewField;
  fieldIconProps?: Omit<FieldIconProps, 'type'>;
  scripted?: boolean;
  highlight?: string;
}

export function FieldName({
  fieldName,
  fieldMapping,
  fieldType,
  fieldIconProps,
  scripted = false,
  highlight = '',
}: Props) {
  const typeName = getFieldTypeName(fieldType);
  const displayName =
    fieldMapping && fieldMapping.displayName ? fieldMapping.displayName : fieldName;
  const tooltip = displayName !== fieldName ? `${fieldName} (${displayName})` : fieldName;
  const subTypeMulti = fieldMapping && getFieldSubtypeMulti(fieldMapping.spec);
  const isMultiField = !!subTypeMulti?.multi;

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
            <EuiHighlight search={highlight}>{displayName}</EuiHighlight>
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
