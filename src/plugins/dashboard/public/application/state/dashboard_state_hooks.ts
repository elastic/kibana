/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { DashboardRootState, DashboardDispatch } from './dashboard_state_store';

export const useDashboardDispatch = () => useDispatch<DashboardDispatch>();
export const useDashboardSelector: TypedUseSelectorHook<DashboardRootState> = useSelector;
