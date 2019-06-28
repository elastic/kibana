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

import PropTypes from 'prop-types';
import React from 'react';
import { injectI18n } from '@kbn/i18n/react';
import { IndexPatternSelect } from 'ui/index_patterns/components/index_pattern_select';

import {
  EuiFormRow,
} from '@elastic/eui';

function IndexPatternSelectFormRowUi(props) {
  const {
    controlIndex,
    indexPatternId,
    intl,
    onChange,
  } = props;
  const selectId = `indexPatternSelect-${controlIndex}`;

  return (
    <EuiFormRow
      id={selectId}
      label={intl.formatMessage({
        id: 'inputControl.editor.indexPatternSelect.patternLabel',
        defaultMessage: 'Index Pattern'
      })}
    >
      <IndexPatternSelect
        placeholder={intl.formatMessage({
          id: 'inputControl.editor.indexPatternSelect.patternPlaceholder',
          defaultMessage: 'Select index pattern...'
        })}
        indexPatternId={indexPatternId}
        onChange={onChange}
        data-test-subj={selectId}
      />
    </EuiFormRow>
  );
}

IndexPatternSelectFormRowUi.propTypes = {
  onChange: PropTypes.func.isRequired,
  indexPatternId: PropTypes.string,
  controlIndex: PropTypes.number.isRequired,
};

export const IndexPatternSelectFormRow = injectI18n(IndexPatternSelectFormRowUi);
