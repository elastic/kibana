import asset from './asset/asset';
import clientdata from './clientdata/clientdata';
import filters from './filters/filters';
import geoip from './geoip/geoip';
import location from './location/location';
import navigator from './navigator/navigator';
import to from './to/to';
import urlparam from './urlparam/urlparam';

export const clientFunctions = [
  clientdata,
  geoip,
  location,
  navigator,
  filters,
  asset,
  to,
  urlparam,
];
