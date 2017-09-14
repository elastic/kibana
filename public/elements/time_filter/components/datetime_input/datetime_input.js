import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';
import moment from 'moment';
import './datetime_input.less';

export const DatetimeInput = ({ strValue, setStrValue, setMoment, valid, setValid }) => {
  function check(e) {
    const parsed = moment(e.target.value, 'YYYY-MM-DD hh:mm:ss', true);
    if (parsed.isValid()) {
      setMoment(parsed);
      setValid(true);
    } else {
      setValid(false);
    }
    setStrValue(e.target.value);
  }

  return (
    <FormControl
      spellCheck={false}
      value={strValue}
      onChange={check}
      className={ valid ? '' : 'has-error' }
      style={{ textAlign: 'center' }}
    />
  );
};

DatetimeInput.propTypes = {
  setMoment: PropTypes.func,
  strValue: PropTypes.string,
  setStrValue: PropTypes.func,
  valid: PropTypes.bool,
  setValid: PropTypes.func,
};
