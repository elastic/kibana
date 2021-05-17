/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisTypeXyPluginSetupDependencies } from './plugin';

export function getExpressionFunctionsRegister(
  expressions: VisTypeXyPluginSetupDependencies['expressions']
) {
  let isExpressionFunctionsRegistered = false;

  return async () => {
    if (!isExpressionFunctionsRegistered) {
      const {
        visTypeXyVisFn,
        categoryAxis,
        timeMarker,
        valueAxis,
        seriesParam,
        thresholdLine,
        label,
        visScale,
        xyDimension,
      } = await import('./expression_functions');

      expressions.registerFunction(visTypeXyVisFn);
      expressions.registerFunction(categoryAxis);
      expressions.registerFunction(timeMarker);
      expressions.registerFunction(valueAxis);
      expressions.registerFunction(seriesParam);
      expressions.registerFunction(thresholdLine);
      expressions.registerFunction(label);
      expressions.registerFunction(visScale);
      expressions.registerFunction(xyDimension);

      isExpressionFunctionsRegistered = true;
    }
  };
}
