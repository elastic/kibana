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

import React, { useEffect } from 'react';
import { isUndefined } from 'lodash';
import { AggParamEditorProps } from 'ui/vis/editors/default';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

function SizeParamEditor({
  value,
  setValue,
  showValidation,
  setValidity,
  setTouched,
}: AggParamEditorProps<number | ''>) {
  const label = i18n.translate('common.ui.aggTypes.sizeLabel', {
    defaultMessage: 'Size',
  });
  const isValid = Number(value) > 0;

  useEffect(
    () => {
      setValidity(isValid);
    },
    [isValid]
  );

  return (
    <EuiFormRow
      label={label}
      fullWidth={true}
      isInvalid={showValidation ? !isValid : false}
      className="visEditorSidebar__aggParamFormRow"
    >
      <EuiFieldNumber
        value={isUndefined(value) ? '' : value}
        onChange={ev => setValue(ev.target.value === '' ? '' : parseFloat(ev.target.value))}
        fullWidth={true}
        isInvalid={showValidation ? !isValid : false}
        onBlur={setTouched}
        min={1}
        data-test-subj="sizeParamEditor"
      />
    </EuiFormRow>
  );
}

export { SizeParamEditor };
