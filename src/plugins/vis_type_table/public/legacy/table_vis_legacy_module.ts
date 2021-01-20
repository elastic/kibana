/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IModule } from 'angular';

// @ts-ignore
import { TableVisController } from './table_vis_controller.js';
// @ts-ignore
import { KbnAggTable } from './agg_table/agg_table';
// @ts-ignore
import { KbnAggTableGroup } from './agg_table/agg_table_group';
// @ts-ignore
import { KbnRows } from './paginated_table/rows';
// @ts-ignore
import { PaginatedTable } from './paginated_table/paginated_table';

/** @internal */
export const initTableVisLegacyModule = (angularIns: IModule): void => {
  angularIns
    .controller('KbnTableVisController', TableVisController)
    .directive('kbnAggTable', KbnAggTable)
    .directive('kbnAggTableGroup', KbnAggTableGroup)
    .directive('kbnRows', KbnRows)
    .directive('paginatedTable', PaginatedTable);
};
