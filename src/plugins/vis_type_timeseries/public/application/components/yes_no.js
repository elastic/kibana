/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';
import { EuiRadio, htmlIdGenerator } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function YesNo(props) {
  const { name, value, disabled, 'data-test-subj': dataTestSubj } = props;
  const handleChange = (value) => {
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
        data-test-subj={`${dataTestSubj}-yes`}
        label={
          <FormattedMessage
            id="visTypeTimeseries.yesButtonLabel"
            defaultMessage="Yes"
            description="The 'yes' in a yes/no answer choice."
          />
        }
        className="eui-displayInlineBlock"
        name={inputName}
        checked={Boolean(value)}
        value="yes"
        onChange={handleChange(1)}
        disabled={disabled}
      />
      &emsp;
      <EuiRadio
        id={htmlId('no')}
        data-test-subj={`${dataTestSubj}-no`}
        label={
          <FormattedMessage
            id="visTypeTimeseries.noButtonLabel"
            defaultMessage="No"
            description="The 'no' in a yes/no answer choice."
          />
        }
        className="eui-displayInlineBlock"
        name={inputName}
        checked={!Boolean(value)}
        value="no"
        onChange={handleChange(0)}
        disabled={disabled}
      />
    </div>
  );
}

YesNo.propTypes = {
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

YesNo.defaultProps = {
  disabled: false,
};
