import { advancedFilter } from './advanced_filter';
import { dropdownFilter } from './dropdown_filter';
import { debug } from './debug';
import { error } from './error';
import { grid } from './grid';
import { image } from './image';
import { repeatImage } from './repeat_image';
import { revealImage } from './reveal_image';
import { markdown } from './markdown';
import { pie } from './pie';
import { plot } from './plot';
import { table } from './table';
import { timeFilter } from './time_filter';
import { text } from './text';

export const renderFunctions = [
  advancedFilter,
  dropdownFilter,
  debug,
  error,
  grid,
  image,
  repeatImage,
  revealImage,
  markdown,
  pie,
  plot,
  table,
  timeFilter,
  text,
];
