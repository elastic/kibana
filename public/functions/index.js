import { asset } from './asset';
import { filters } from './filters';
import { geoip } from './geoip';
import { location } from './location';
import { urlparam } from './urlparam';

export const clientFunctions = [geoip, location, filters, asset, urlparam];
