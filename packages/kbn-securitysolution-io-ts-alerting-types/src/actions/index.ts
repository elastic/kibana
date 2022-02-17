/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { saved_object_attributes } from '../saved_object_attributes';

/**
 * Params is an "object", since it is a type of AlertActionParams which is action templates.
 * @see x-pack/plugins/alerting/common/alert.ts
 */
export const action_group = t.string;
export const action_id = t.string;
export const action_action_type_id = t.string;
export const action_params = saved_object_attributes;

export const action = t.exact(
  t.type({
    group: action_group,
    id: action_id,
    action_type_id: action_action_type_id,
    params: action_params,
  })
);

export type Action = t.TypeOf<typeof action>;

export const actions = t.array(action);
export type Actions = t.TypeOf<typeof actions>;

export const actionsCamel = t.array(
  t.exact(
    t.type({
      group: action_group,
      id: action_id,
      actionTypeId: action_action_type_id,
      params: action_params,
    })
  )
);
export type ActionsCamel = t.TypeOf<typeof actions>;
