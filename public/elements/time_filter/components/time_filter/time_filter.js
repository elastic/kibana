import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { fromExpression } from '../../../../../common/lib/ast';
import { TimePicker } from '../time_picker';

export const TimeFilter = ({ filter, setFilter }) => {
  const ast = fromExpression(filter);

  const from = get(ast, 'chain[0].arguments.from[0]');
  const to = get(ast, 'chain[0].arguments.to[0]');
  const column = get(ast, 'chain[0].arguments.column[0]');

  function doSetFilter(from, to) {

    setFilter(`timefilter from="${from}" to=${to} column=${column}`);
  }

  return (<TimePicker from={from} to={to} onSelect={doSetFilter}/>);
};

TimeFilter.propTypes = {
  filter: PropTypes.string,
  setFilter: PropTypes.func, // Local state
  commit: PropTypes.func, // Canvas filter
};
