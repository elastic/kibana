import type { ApplicationStart, CoreStart } from '@kbn/core/public';
import type { AbstractDataView } from '@kbn/data-views-plugin/common';
import type { IEsError } from './types';
import type { EsError } from './es_error';
export interface Services {
    application: ApplicationStart;
    docLinks: CoreStart['docLinks'];
}
export declare function createEsError(err: IEsError, openInInspector: () => void, services: Services, dataView?: AbstractDataView): EsError;
