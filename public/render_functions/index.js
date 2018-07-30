import { advancedFilter } from './advanced_filter';
import { dropdownFilter } from './dropdown_filter';
import { debug } from './debug';
import { error } from './error';
import { image } from './image';
import { repeatImage } from './repeat_image';
import { revealImage } from './reveal_image';
import { markdown } from './markdown';
import { metric } from './metric';
import { pie } from './pie';
import { plot } from './plot';
import { shape } from './shape';
import { table } from './table';
import { timeFilter } from './time_filter';
import { text } from './text';

export const renderFunctions = [
  advancedFilter,
  dropdownFilter,
  debug,
  error,
  image,
  repeatImage,
  revealImage,
  markdown,
  metric,
  pie,
  plot,
  shape,
  table,
  timeFilter,
  text,
];
