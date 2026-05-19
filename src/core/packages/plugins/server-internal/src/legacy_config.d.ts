import type { Observable } from 'rxjs';
import type { IConfigService } from '@kbn/config';
import type { SharedGlobalConfig } from '@kbn/core-plugins-server';
export declare const getGlobalConfig: (configService: IConfigService) => SharedGlobalConfig;
export declare const getGlobalConfig$: (configService: IConfigService) => Observable<SharedGlobalConfig>;
