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

/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormLabel,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggConfig } from '../../agg_config';
import { Schemas } from './schemas';

const GROUP_NAMES = {
  BUCKETS: 'buckets',
};

interface AggAddReactWrapperProps {
  aggs: AggConfig[];
  availableSchema: Schemas[];
  groupName: string;
  groupNameLabel: string;
  stats: {
    max: number;
    min: number;
    count: number;
    deprecate: boolean;
  };
  addSchema(schema: Schemas): void;
}

function AggAddReactWrapper<T>({
  aggs,
  availableSchema,
  groupName,
  groupNameLabel,
  addSchema,
  stats,
}: AggAddReactWrapperProps) {
  if (!aggs && !availableSchema) return null;

  const [formVisibility, setformVisibility] = useState(stats.count < 1);
  const onSelectSchema = (schema: any) => {
    setformVisibility(false);
    addSchema(schema);
  };

  return (
    <>
      {formVisibility && (
        <EuiForm className="form-group">
          <EuiFormLabel>
            <FormattedMessage
              id="common.ui.vis.editors.aggAdd.selectGroupTypeLabel"
              defaultMessage="Select {groupNameLabel} type"
              values={{ groupNameLabel }}
            />
          </EuiFormLabel>
          <ul className="list-group list-group-menu">
            {availableSchema.map(
              (schema, index) =>
                !schema.deprecate && (
                  <li
                    key={`${schema.name}_${schema.title}`}
                    tabIndex={0}
                    id={`aggSchemaListItem-${index}`}
                    className="list-group-item list-group-menu-item"
                    data-test-subj={schema.title}
                    onClick={() => onSelectSchema(schema)}
                  >
                    {schema.icon && (
                      <>
                        <i className={schema.icon} />{' '}
                      </>
                    )}
                    {schema.title}
                  </li>
                )
            )}
          </ul>
        </EuiForm>
      )}

      <EuiSpacer size="s" />

      {stats.max > stats.count ? (
        formVisibility ? (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton color="danger" size="s" onClick={() => setformVisibility(false)}>
                <FormattedMessage
                  id="common.ui.vis.editors.aggAdd.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                size="s"
                data-test-subj="visualizeEditorAddAggregationButton"
                onClick={() => setformVisibility(true)}
              >
                {(groupName !== GROUP_NAMES.BUCKETS || (!stats.count && !stats.deprecate)) && (
                  <FormattedMessage
                    id="common.ui.vis.editors.aggAdd.addGroupButtonLabel"
                    defaultMessage="Add {groupNameLabel}"
                    values={{ groupNameLabel }}
                  />
                )}
                {groupName === GROUP_NAMES.BUCKETS && stats.count > 0 && !stats.deprecate && (
                  <FormattedMessage
                    id="common.ui.vis.editors.aggAdd.addSubGroupButtonLabel"
                    defaultMessage="Add sub-{groupNameLabel}"
                    values={{ groupNameLabel }}
                  />
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        )
      ) : null}
    </>
  );
}

export { AggAddReactWrapper };
