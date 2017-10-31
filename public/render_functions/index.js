import { advancedFilter } from './advanced_filter';
import { debug } from './debug';
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
  grid,
  image,
  markdown,
  pie,
  plot,
  table,
  timeFilter,
];
