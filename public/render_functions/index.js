import { advancedFilter } from './advanced_filter';
import { debug } from './debug';
import { error } from './error';
import { grid } from './grid';
import { image } from './image';
import { markdown } from './markdown';
import { pie } from './pie';
import { plot } from './plot';
import { table } from './table';
import { timeFilter } from './time_filter';

export const renderFunctions = [
  advancedFilter,
  debug,
  error,
  grid,
  image,
  markdown,
  pie,
  plot,
  table,
  timeFilter,
];
