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

import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';

const guidPattern = /\[[[a-f\d-\\]{36}\]/g;

export function ErrorComponent(props) {
  const { error } = props;
  let additionalInfo;
  const type = _.get(error, 'error.caused_by.type') || _.get(error, 'error.type');
  let reason = _.get(error, 'error.caused_by.reason');
  const title = _.get(error, 'error.caused_by.title');

  if (!reason) {
    reason = _.get(error, 'message');
  }

  if (['runtime_exception', 'illegal_argument_exception'].includes(type)) {
    reason = _.get(error, 'error.reason').replace(guidPattern, ``);
  }

  if (type === 'script_exception') {
    const scriptStack = _.get(error, 'error.caused_by.script_stack');
    reason = _.get(error, 'error.caused_by.caused_by.reason');
    additionalInfo = (
      <div className="tvbError__additional">
        <div>{reason}</div>
        <div className="tvbError__stack">{scriptStack.join('\n')}</div>
      </div>
    );
  } else if (reason) {
    additionalInfo = <div className="tvbError__additional">{reason}</div>;
  }

  return (
    <div className="visError">
      <EuiText size="xs" color="subdued">
        <EuiIcon type="alert" size="m" color="danger" aria-hidden="true" />

        <EuiSpacer size="s" />

        {title || (
          <FormattedMessage
            id="visTypeTimeseries.error.requestForPanelFailedErrorMessage"
            defaultMessage="The request for this panel failed"
          />
        )}

        {additionalInfo}
      </EuiText>
    </div>
  );
}

ErrorComponent.propTypes = {
  error: PropTypes.object,
};
