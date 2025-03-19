/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewMgmtState } from './data_view_management_service';

export const dataViewSelector = (state: DataViewMgmtState) => state.dataView;
export const allowedTypesSelector = (state: DataViewMgmtState) => state.allowedTypes;
export const relationshipsSelector = (state: DataViewMgmtState) => state.relationships;
export const tagsSelector = (state: DataViewMgmtState) => state.tags;
export const isRefreshingSelector = (state: DataViewMgmtState) => state.isRefreshing;
export const defaultIndexSelector = (state: DataViewMgmtState) => state.defaultIndex;
export const fieldsSelector = (state: DataViewMgmtState) => state.fields;
export const indexedFieldTypeSelector = (state: DataViewMgmtState) => state.indexedFieldTypes;
export const scriptedFieldLangsSelector = (state: DataViewMgmtState) => state.scriptedFieldLangs;
