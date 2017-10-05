import { Observable } from 'rxjs';

import { XPackConfig } from './XPackConfig';

export interface XPackExports {
  config$: Observable<XPackConfig>;
}

export interface XPackPluginType {
  xpack: XPackExports;
}
