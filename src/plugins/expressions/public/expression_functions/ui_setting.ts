/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup } from '../../../../core/public';
import { getUiSettingFn as getCommonUiSettingFn } from '../../common/expression_functions/specs/ui_setting';

export function getUiSettingFn({ getStartServices }: Pick<CoreSetup, 'getStartServices'>) {
  return getCommonUiSettingFn({
    async getStartDependencies() {
      const [{ uiSettings }] = await getStartServices();

      return { uiSettings };
    },
  });
}
