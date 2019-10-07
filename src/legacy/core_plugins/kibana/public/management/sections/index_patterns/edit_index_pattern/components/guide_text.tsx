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
import { EuiText, EuiLink, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  indexPattern: any;
}

export const GuideText = ({ indexPattern }: Props) => {
  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="kbn.management.editIndexPattern.timeFilterLabel.timeFilterDetail"
          defaultMessage="This page lists every field in the {indexPatternTitle} index and the field's associated core type as recorded by Elasticsearch. To change a field type, use the Elasticsearch {apiLink}."
          values={{
            indexPatternTitle: <strong>{indexPattern.title}</strong>,
            apiLink: (
              <EuiLink
                target="_blank"
                href="http://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html"
              >
                <FormattedMessage
                  id="kbn.management.editIndexPattern.timeFilterLabel.mappingAPILink"
                  defaultMessage="Mapping API"
                />
                <EuiIcon type="link" />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );
};
