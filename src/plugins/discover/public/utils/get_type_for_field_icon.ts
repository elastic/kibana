/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from 'src/plugins/data_views/common';

/**
 * Extracts the type from a data view field that will match the right icon.
 *
 * We define custom logic for Discover in order to distinguish between various "string" types.
 */
export const getTypeForFieldIcon = (field: DataViewField) =>
  field.type === 'string' && field.esTypes ? field.esTypes[0] : field.type;
