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
import React from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DiscoverFieldDetails, Field } from './discover_field_details';
import { FieldIcon } from '../../../../../../../../plugins/kibana_react/public';

export interface Props {
  field: Field;
  details: any;
  onAddField: any;
  onAddFilter: any;
  onRemoveField: any;
  onShowDetails: any;
  showDetails: boolean;
}

export function DiscoverField({
  field,
  details,
  onAddField,
  onRemoveField,
  onAddFilter,
  onShowDetails,
  showDetails,
}: Props) {
  const addLabel = i18n.translate('kbn.discover.fieldChooser.discoverField.addButtonLabel', {
    defaultMessage: 'Add to selected fields',
  });
  const removeLabel = i18n.translate('kbn.discover.fieldChooser.discoverField.removeButtonLabel', {
    defaultMessage: 'Remove from selected fields',
  });

  const toggleDisplay = (f: Field) => {
    if (f.display) {
      onRemoveField(f.name);
    } else {
      onAddField(f.name);
    }
  };

  return (
    <div className={`${showDetails ? 'dscSidebarItemExpanded' : ''}`}>
      <div className="dscSidebarField sidebar-item-title dscSidebarItem">
        <span className="dscSidebarField__fieldIcon">
          <FieldIcon type={field.type} label={field.name} />
        </span>
        <span className="dscSidebarField__name eui-textTruncate">
          <EuiToolTip
            position="top"
            content={field.name}
            delay="long"
            anchorClassName="eui-textTruncate"
          >
            <EuiButtonEmpty
              color="text"
              size="xs"
              data-test-subj={`field-${field.name}`}
              onClick={() => onShowDetails(!showDetails, field, true)}
              flush="left"
              style={{ textAlign: 'left' }}
            >
              {field.name}
            </EuiButtonEmpty>
          </EuiToolTip>
        </span>
        <span className="dscSidebarField__infoIcon">
          {field.name !== '_source' && !field.display && (
            <EuiToolTip position="top" content={addLabel}>
              <EuiButtonIcon
                className="dscSidebarItem__action"
                iconType="plusInCircleFilled"
                onClick={() => toggleDisplay(field)}
                data-test-subj={`fieldToggle-${field.name}`}
                aria-label={addLabel}
              />
            </EuiToolTip>
          )}
          {field.name !== '_source' && field.display && (
            <EuiToolTip position="top" content={removeLabel}>
              <EuiButtonIcon
                className="dscSidebarItem__action"
                iconType="minusInCircleFilled"
                onClick={() => toggleDisplay(field)}
                data-test-subj={`fieldToggle-${field.name}`}
                aria-label={removeLabel}
              />
            </EuiToolTip>
          )}
        </span>
      </div>
      {showDetails && (
        <DiscoverFieldDetails field={field} details={details} onAddFilter={onAddFilter} />
      )}
    </div>
  );
}
