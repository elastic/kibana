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
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { getDataViewFieldSubtypeMulti } from '@kbn/es-query';
import {
  FieldDescriptionIconButton,
  getFieldDescription,
  getFieldTypeName,
} from '@kbn/field-utils';

interface Props {
  fieldName: string;
  fieldType?: string;
  fieldMapping?: DataViewField;
  fieldIconProps?: Omit<FieldIconProps, 'type'>;
  scripted?: boolean;
  highlight?: string;
  showEcsInfo?: boolean;
}

export function FieldName({
  fieldName,
  fieldMapping,
  fieldType,
  fieldIconProps,
  scripted = false,
  highlight = '',
  showEcsInfo = false,
}: Props) {
  const typeName = getFieldTypeName(fieldType);
  const displayName =
    fieldMapping && fieldMapping.displayName ? fieldMapping.displayName : fieldName;
  const tooltip = displayName !== fieldName ? `${displayName} (${fieldName})` : fieldName;
  const subTypeMulti = fieldMapping && getDataViewFieldSubtypeMulti(fieldMapping.spec);
  const isMultiField = !!subTypeMulti?.multi;
  const description = fieldMapping
    ? getFieldDescription(fieldMapping?.name, fieldMapping?.customDescription, showEcsInfo)
    : '';

  return (
    <Fragment>
      <EuiFlexItem grow={false} className="kbnDocViewer__fieldIcon">
        <FieldIcon type={fieldType!} label={typeName} scripted={scripted} {...fieldIconProps} />
      </EuiFlexItem>

      <EuiFlexGroup gutterSize="none" responsive={false} alignItems="flexStart" direction="row">
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

        {description ? (
          <EuiFlexItem grow={false}>
            <FieldDescriptionIconButton name={fieldMapping?.name} description={description} />
          </EuiFlexItem>
        ) : null}

        {isMultiField && (
          <EuiToolTip
            position="top"
            delay="long"
            content={i18n.translate(
              'unifiedDocViewer.fieldChooser.discoverField.multiFieldTooltipContent',
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
                id="unifiedDocViewer.fieldChooser.discoverField.multiField"
                defaultMessage="multi-field"
              />
            </EuiBadge>
          </EuiToolTip>
        )}
      </EuiFlexGroup>
    </Fragment>
  );
}
