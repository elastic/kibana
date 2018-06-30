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
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty
} from '@elastic/eui';

import { ReactI18n } from '@kbn/i18n';

const { FormattedMessage } = ReactI18n;

export const ActionButtons = ({
  goToPreviousStep,
  submittable,
  createIndexPattern,
}) => (
  <EuiFlexGroup justifyContent="flexEnd">
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        iconType="arrowLeft"
        onClick={goToPreviousStep}
      >
        <FormattedMessage
          id="kbn.management.indexPattern.create.stepTime.back.button"
          defaultMessage="Back"
        />
      </EuiButtonEmpty>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton
        isDisabled={!submittable}
        data-test-subj="createIndexPatternCreateButton"
        fill
        onClick={createIndexPattern}
      >
        <FormattedMessage
          id="kbn.management.indexPattern.create.stepTime.createPattern.button"
          defaultMessage="Create index pattern"
        />
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
