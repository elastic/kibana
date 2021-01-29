/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Get agg id from accessor
 *
 * For now this is determined by the esaggs column name. Could be cleaned up in the future.
 */
export const getAggId = (accessor: string) => (accessor ?? '').split('-').pop() ?? '';
