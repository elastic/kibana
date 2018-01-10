import React from 'react';
import { PropTypes } from 'prop-types';
import { formatDuration } from './lib/format_duration';

export const PrettyDuration = ({ from, to }) => <span>{formatDuration(from, to)}</span>;

PrettyDuration.propTypes = {
  from: PropTypes.any.isRequired,
  to: PropTypes.any.isRequired,
};
