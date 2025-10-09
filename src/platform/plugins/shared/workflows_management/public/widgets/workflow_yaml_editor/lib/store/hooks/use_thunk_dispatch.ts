/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ThunkAction, Action } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';

type ThunkDispatch = <R, S, E, A>(action: ThunkAction<R, S, E, Action<A>>) => Promise<R>;

export const useThunkDispatch = () => useDispatch<ThunkDispatch>();
