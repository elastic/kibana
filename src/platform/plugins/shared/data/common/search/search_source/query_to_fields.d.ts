import type { DataViewLazy } from '@kbn/data-views-plugin/common';
import type { SearchRequest } from './fetch';
import type { EsQuerySortValue } from '../..';
export declare function queryToFields({ dataView, sort, request, }: {
    dataView: DataViewLazy;
    sort?: EsQuerySortValue | EsQuerySortValue[];
    request: SearchRequest;
}): Promise<Record<string, import("@kbn/data-views-plugin/common").DataViewField>>;
