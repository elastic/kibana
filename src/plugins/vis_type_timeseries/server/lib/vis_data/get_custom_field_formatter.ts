/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFieldFormats } from '../../services';
import type { IUiSettingsClient } from '../../../../../core/server';
import type { FieldFormat, FieldFormatMap } from '../../../../data/common';

export type CustomFieldFormatter = (fieldName: string) => FieldFormat;

export const getCustomFieldFormatter = async (
  uiSettings: IUiSettingsClient,
  fieldFormatMap?: FieldFormatMap
): Promise<CustomFieldFormatter | undefined> => {
  let customFieldFormatter;
  if (fieldFormatMap) {
    const fieldFormatsService = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    customFieldFormatter = (fieldName: string) =>
      fieldFormatsService.deserialize(fieldFormatMap[fieldName]);
  }

  return customFieldFormatter;
};
