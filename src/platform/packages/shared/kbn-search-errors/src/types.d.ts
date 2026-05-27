import type { IEsErrorAttributes } from '@kbn/search-types';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
export type IEsError = KibanaServerError<IEsErrorAttributes>;
