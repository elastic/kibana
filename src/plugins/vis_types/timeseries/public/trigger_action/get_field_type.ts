/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getDataStart } from '../services';

export const getFieldType = async (indexPatternId: string, fieldName: string) => {
  const { dataViews } = getDataStart();
  const dataView = await dataViews.get(indexPatternId);
  const field = await dataView.getFieldByName(fieldName);
  return field?.type;
};
