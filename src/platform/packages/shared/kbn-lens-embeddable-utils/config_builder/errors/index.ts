/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { LENS_ERROR_CODES, LENS_ERROR_TYPE, isLensErrorCode } from './constants';
export type { LensErrorCode } from './constants';
export { LensError } from './lens_error';
export { InvalidConfigurationError } from './invalid_configuration_error';
export { DataViewNotFoundError } from './data_view_not_found_error';
export { DatasourceNotFoundError } from './datasource_not_found_error';
export { DatasourceUnsupportedError } from './datasource_unsupported_error';
