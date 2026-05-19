import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
export declare function prepareDataViewForEditing(dataView: DataView, dataViewsService: DataViewsServicePublic): Promise<DataView>;
