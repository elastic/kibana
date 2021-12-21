/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IEsSearchRequest, IEsSearchResponse } from '../../data/common';

export interface IMyStrategyRequest extends IEsSearchRequest {
  get_project_id: number;
  time_from: number;
  time_to: number;
}
export interface IMyStrategyResponse extends IEsSearchResponse {
  executed_at: number;
}
/*
const technicalFieldRuntimeType = runtimeTypeFromFieldMap(technicalRuleFieldMap);

export const parseTechnicalFields = (input: unknown) => {
  const validate = technicalFieldRuntimeType.decode(input);

  if (isLeft(validate)) {
    throw new Error(PathReporter.report(validate).join('\n'));
  }
  return technicalFieldRuntimeType.encode(validate.right);
};

export type ParsedTechnicalFields = ReturnType<typeof parseTechnicalFields>;
*/
