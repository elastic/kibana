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
import { EuiFormRow, EuiIconTip, EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

function SizeParamEditor({
  agg,
  value,
  setValue,
  showValidation,
  setValidity,
  setTouched,
  wrappedWithInlineComp,
}: AggParamEditorProps<number | ''>) {
  const label = (
    <>
      <FormattedMessage id="common.ui.aggTypes.sizeLabel" defaultMessage="Size" />
      {agg.type.name === 'top_hits' ? (
        <>
          {' '}
          <EuiIconTip
            position="right"
            content={i18n.translate('common.ui.aggTypes.sizeTooltip', {
              defaultMessage:
                "Request top-K hits. Multiple hits will be combined via 'aggregate with'.",
            })}
            type="questionInCircle"
          />
        </>
      ) : null}
    </>
  );
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
      className={wrappedWithInlineComp ? undefined : 'visEditorSidebar__aggParamFormRow'}
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
