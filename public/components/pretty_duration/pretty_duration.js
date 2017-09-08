import React from 'react';
import { formatDuration } from './lib/format_duration';

export const PrettyDuration = ({from, to}) => (
  <div>{formatDuration(from, to)}</div>
);
