import { asset } from './asset/asset';
import { filters } from './filters/filters';
import { geoip } from './geoip/geoip';
import { location } from './location/location';
import { navigator } from './navigator/navigator';
import { toFn } from './to/to';
import { urlparam } from './urlparam/urlparam';

export const clientFunctions = [
  geoip,
  location,
  navigator,
  filters,
  asset,
  toFn,
  urlparam,
];
