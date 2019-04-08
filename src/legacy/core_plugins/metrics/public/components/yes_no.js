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
import _ from 'lodash';
import { EuiRadio, htmlIdGenerator } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

function YesNo(props) {
  const { name, value } = props;
  const handleChange = value => {
    const { name } = props;
    return () => {
      const parts = { [name]: value };
      props.onChange(parts);
    };
  };
  const htmlId = htmlIdGenerator();
  const inputName = name + _.uniqueId();
  return (
    <div>
      <EuiRadio
        id={htmlId('yes')}
        label={(<FormattedMessage
          id="tsvb.yesButtonLabel"
          defaultMessage="Yes"
        />)}
        className="eui-displayInlineBlock"
        name={inputName}
        checked={Boolean(value)}
        value="yes"
        onChange={handleChange(1)}
      />

      &emsp;

      <EuiRadio
        id={htmlId('no')}
        label={(<FormattedMessage
          id="tsvb.noButtonLabel"
          defaultMessage="No"
        />)}
        className="eui-displayInlineBlock"
        name={inputName}
        checked={!Boolean(value)}
        value="no"
        onChange={handleChange(0)}
      />
    </div>
  );
}

YesNo.propTypes = {
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

export default YesNo;
