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

export type RuleActionUuid = t.TypeOf<typeof RuleActionUuid>;
export const RuleActionUuid = t.string;

export type RuleActionOptionalUuid = t.TypeOf<typeof RuleActionOptionalUuid>;
export const RuleActionOptionalUuid = t.union([RuleActionUuid, t.undefined]);

/**
 * Params is an "object", since it is a type of RuleActionParams which is action templates.
 * @see x-pack/plugins/alerting/common/rule.ts
 */
export type RuleActionParams = t.TypeOf<typeof RuleActionParams>;
export const RuleActionParams = saved_object_attributes;

const BaseRuleAction = t.type({
  group: RuleActionGroup,
  id: RuleActionId,
  action_type_id: RuleActionTypeId,
  params: RuleActionParams,
});

export type RuleAction = t.TypeOf<typeof RuleAction>;
export const RuleAction = t.exact(
  t.intersection([BaseRuleAction, t.type({ uuid: RuleActionUuid })])
);

export type RuleActionArray = t.TypeOf<typeof RuleActionArray>;
export const RuleActionArray = t.array(RuleAction);

// --------

const BaseRuleActionCamel = t.type({
  group: RuleActionGroup,
  id: RuleActionId,
  actionTypeId: RuleActionTypeId,
  params: RuleActionParams,
});

export type RuleActionCamel = t.TypeOf<typeof RuleActionCamel>;
export const RuleActionCamel = t.exact(
  t.intersection([BaseRuleActionCamel, t.type({ uuid: RuleActionUuid })])
);

export type RuleActionArrayCamel = t.TypeOf<typeof RuleActionArrayCamel>;
export const RuleActionArrayCamel = t.array(RuleActionCamel);

// --------

export const RuleActionWithOptionalUuidArray = t.array(
  t.exact(t.intersection([BaseRuleAction, t.partial({ uuid: RuleActionOptionalUuid })]))
);

export const RuleActionWithOptionalUuidArrayCamel = t.array(
  t.exact(t.intersection([BaseRuleActionCamel, t.partial({ uuid: RuleActionOptionalUuid })]))
);

// --------
export type RuleActionWithoutUuidArray = t.TypeOf<typeof RuleActionWithoutUuidArray>;
export const RuleActionWithoutUuidArray = t.array(t.exact(BaseRuleAction));

export const RuleActionWithoutUuidArrayCamel = t.array(t.exact(BaseRuleActionCamel));
