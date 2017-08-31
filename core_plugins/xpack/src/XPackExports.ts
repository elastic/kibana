import { Observable } from 'kbn-types';

import { XPackConfig } from './XPackConfig';

export interface XPackExports {
  config$: Observable<XPackConfig>;
}

export interface XPackPluginType {
  xpack: XPackExports;
}
