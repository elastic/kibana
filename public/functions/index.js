import { asset } from './asset/asset';
import { filters } from './filters/filters';
import { geoip } from './geoip/geoip';
import { location } from './location/location';
import { toFn } from './to/to';
import { urlparam } from './urlparam/urlparam';

export const clientFunctions = [
  geoip,
  location,
  filters,
  asset,
  toFn,
  urlparam,
];
