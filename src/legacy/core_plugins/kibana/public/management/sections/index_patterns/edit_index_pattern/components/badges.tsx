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
import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  indexPattern: any;
}

export const Badges = ({ indexPattern }: Props) => {
  return (
    <p>
      {indexPattern.timeFieldName ? (
        <EuiBadge color="warning">
          <FormattedMessage
            id="kbn.management.editIndexPattern.timeFilterHeader"
            defaultMessage="Time Filter field name: {timeFieldName}"
            values={{
              timeFieldName: indexPattern.timeFieldName,
            }}
          />
        </EuiBadge>
      ) : null}
      {indexPattern.tags && indexPattern.tags.length
        ? indexPattern.tags.map((tag: any, i: number) => {
            return (
              <EuiBadge key={i} color="hollow">
                {tag.name}
              </EuiBadge>
            );
          })
        : null}
    </p>
  );
};
