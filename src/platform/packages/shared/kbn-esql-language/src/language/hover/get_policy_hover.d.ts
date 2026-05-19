import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ESQLSource } from '@elastic/esql/types';
export declare function getPolicyHover(source: ESQLSource, callbacks?: ESQLCallbacks): Promise<Array<{
    value: string;
}>>;
