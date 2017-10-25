import { advancedFilter } from './advanced_filter/advanced_filter';
import { debug } from './debug/debug';
import { grid } from './grid/grid';
import { image } from './image/image';
import { markdown } from './markdown/markdown';
import { pie } from './pie/pie';
import { plot } from './plot/plot';
import { table } from './table/table';
import { timeFilter } from './time_filter/time_filter';

export const elementSpecs = [
  advancedFilter,
  timeFilter,
  debug,
  grid,
  image,
  markdown,
  plot,
  pie,
  table,
];
