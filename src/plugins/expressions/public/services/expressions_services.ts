/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup } from '../../../../core/public/types';
import { ExpressionsService as CommonExpressionsService } from '../../common/service/expressions_services';
import { getUiSettingFn } from '../expression_functions/ui_setting';

export class ExpressionsService extends CommonExpressionsService {
  setup({ getStartServices }: Pick<CoreSetup, 'getStartServices'>) {
    this.registerFunction(getUiSettingFn({ getStartServices }));

    return super.setup();
  }
}
