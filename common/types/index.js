import { boolean } from './boolean';
import { datatable } from './datatable';
import { dataurl } from './dataurl';
import { filter } from './filter';
import { image } from './image';
import { location } from './location';
import { number } from './number';
import { pointseries } from './pointseries';
import { render } from './render';
import { string } from './string';
import { style } from './style';

export const typeSpecs = [
  datatable,
  style,
  pointseries,
  number,
  string,
  dataurl,
  image,
  filter,
  render,
  location,
  boolean,
];
