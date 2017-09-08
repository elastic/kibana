import React from 'react';
import PropTypes from 'prop-types';
import PrettyDuration from '../../../../components/pretty_duration';
//import { fromExpression, toExpression } from '../../../../../common/lib/ast';
//import { set } from 'lodash';

/*
function setFilterArgument(filter, argumentName, value) {
  return toExpression(
    set(
      fromExpression(filter),
      ['chain', 0, 'arguments', argumentName, 0],
      { type: 'string', value }
    )
  );
}
*/

export const TimeFilter = ({ filter, /*onChange,*/ commit }) => (
  <form onSubmit={e => { e.preventDefault(); commit(/*value*/); }} className="canvas__element__advanced_filter">
    <pre>{filter}</pre>
  </form>
);

TimeFilter.propTypes = {
  onChange: PropTypes.func,
  filter: PropTypes.string,
  commit: PropTypes.func,
};
