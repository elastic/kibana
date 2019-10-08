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
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldNameIcon } from 'ui/directives/field_name/field_name_icon';
import { DiscoverFieldDetails, Field } from './discover_field_details';

export interface Props {
  field: Field;
  onAddField: any;
  onAddFilter: any;
  onRemoveField: any;
}
export function DiscoverField({ field, onAddField, onRemoveField, onAddFilter }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  const toggleDisplay = (f: Field) => {
    if (f.display) {
      onRemoveField(f.name);
    } else {
      onAddField(f.name);
    }
  };

  return (
    <>
      <div className={`dscSidebarItem ${showDetails ? 'dscSidebarItemExpanded' : ''}`}>
        <EuiFlexGroup responsive={false} gutterSize={'none'}>
          <EuiFlexItem className="dscSidebarItem__label">
            <div>
              <EuiButtonEmpty
                size="xs"
                data-test-subj={`field-${field.name}`}
                onClick={() => setShowDetails(!showDetails)}
                flush="left"
                style={{ textAlign: 'left' }}
              >
                <FieldNameIcon type={field.type} label={field.name} />
                {field.name}
              </EuiButtonEmpty>
            </div>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            {field.name !== '_source' && !field.display && (
              <EuiButtonIcon
                className="dscSidebarItem__action"
                iconType="plusInCircleFilled"
                onClick={() => toggleDisplay(field)}
                data-test-subj={`fieldToggle-${field.name}`}
                aria-label={i18n.translate(
                  'kbn.discover.fieldChooser.discoverField.addButtonLabel',
                  {
                    defaultMessage: 'add',
                  }
                )}
              />
            )}
            {field.name !== '_source' && field.display && (
              <EuiButtonIcon
                className="dscSidebarItem__action"
                iconType="minusInCircleFilled"
                onClick={() => toggleDisplay(field)}
                data-test-subj={`fieldToggle-${field.name}`}
                aria-label={i18n.translate(
                  'kbn.discover.fieldChooser.discoverField.removeButtonLabel',
                  {
                    defaultMessage: 'remove',
                  }
                )}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      {showDetails && field.details && (
        <DiscoverFieldDetails field={field} onAddFilter={onAddFilter} />
      )}
    </>
  );
}
