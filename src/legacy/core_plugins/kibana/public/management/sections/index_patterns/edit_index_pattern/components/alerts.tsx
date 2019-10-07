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
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  conflictFields: any;
}

export const Alerts = ({ conflictFields }: Props) => {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="kbn.management.editIndexPattern.mappingConflictHeader"
          defaultMessage="Mapping conflict"
        />
      }
      color="warning"
      iconType="bolt"
    >
      <FormattedMessage
        id="kbn.management.editIndexPattern.mappingConflictLabel"
        defaultMessage="{conflictFieldsLength, plural, one {A field is} other {# fields are}} defined as several types (string, integer, etc) across the indices that match this pattern. You may still be able to use these conflict fields in parts of Kibana, but they will be unavailable for functions that require Kibana to know their type. Correcting this issue will require reindexing your data."
        values={{
          conflictFieldsLength: conflictFields.length,
        }}
      />
    </EuiCallOut>
  );
};
