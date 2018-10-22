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

import {
  EuiTitle,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const Header = () => (
  <div>
    <EuiTitle size="s">
      <h3>
        <FormattedMessage id="kbn.management.editIndexPattern.sourceHeader" defaultMessage="Source filters"/>
      </h3>
    </EuiTitle>
    <EuiText>
      <p>
        <FormattedMessage
          id="kbn.management.editIndexPattern.sourceLabel"
          defaultMessage="Source filters can be used to exclude one or more fields when fetching the document source. This happens when
          viewing a document in the Discover app, or with a table displaying results from a saved search in the Dashboard app. Each row is
          built using the source of a single document, and if you have documents with large or unimportant fields you may benefit from
          filtering those out at this lower level."
        />
      </p>
      <p>
        <FormattedMessage
          id="kbn.management.editIndexPattern.source.noteLabel"
          defaultMessage="Note that multi-fields will incorrectly appear as matches in the table below. These filters only actually apply
          to fields in the original source document, so matching multi-fields are not actually being filtered."
        />
      </p>
    </EuiText>
    <EuiSpacer size="s" />
  </div>
);
