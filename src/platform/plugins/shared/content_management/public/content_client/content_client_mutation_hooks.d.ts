/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateIn, UpdateIn, DeleteIn } from '../../common';
export declare const useCreateContentMutation: <
  I extends CreateIn = CreateIn,
  O = unknown
>() => import('@tanstack/react-query').UseMutationResult<O, unknown, I, unknown>;
export declare const useUpdateContentMutation: <
  I extends UpdateIn = UpdateIn,
  O = unknown
>() => import('@tanstack/react-query').UseMutationResult<O, unknown, I, unknown>;
export declare const useDeleteContentMutation: <
  I extends DeleteIn = DeleteIn,
  O = unknown
>() => import('@tanstack/react-query').UseMutationResult<O, unknown, I, unknown>;
