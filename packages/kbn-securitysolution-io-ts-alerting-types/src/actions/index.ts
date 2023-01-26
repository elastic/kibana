/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { saved_object_attributes } from '../saved_object_attributes';

export type RuleActionGroup = t.TypeOf<typeof RuleActionGroup>;
export const RuleActionGroup = t.string;

export type RuleActionId = t.TypeOf<typeof RuleActionId>;
export const RuleActionId = t.string;

export type RuleActionTypeId = t.TypeOf<typeof RuleActionTypeId>;
export const RuleActionTypeId = t.string;

/**
 * Params is an "object", since it is a type of RuleActionParams which is action templates.
 * @see x-pack/plugins/alerting/common/rule.ts
 */
export type RuleActionParams = t.TypeOf<typeof RuleActionParams>;
export const RuleActionParams = saved_object_attributes;

export type RuleAction = t.TypeOf<typeof RuleAction>;
export const RuleAction = t.exact(
  t.type({
    group: RuleActionGroup,
    id: RuleActionId,
    action_type_id: RuleActionTypeId,
    params: RuleActionParams,
  })
);

export type RuleActionArray = t.TypeOf<typeof RuleActionArray>;
export const RuleActionArray = t.array(RuleAction);

export type RuleActionCamel = t.TypeOf<typeof RuleActionCamel>;
export const RuleActionCamel = t.exact(
  t.type({
    group: RuleActionGroup,
    id: RuleActionId,
    actionTypeId: RuleActionTypeId,
    params: RuleActionParams,
  })
);

export type RuleActionArrayCamel = t.TypeOf<typeof RuleActionArrayCamel>;
export const RuleActionArrayCamel = t.array(RuleActionCamel);
