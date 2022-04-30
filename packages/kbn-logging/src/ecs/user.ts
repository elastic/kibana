/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsGroup } from './group';

interface NestedFields {
  group?: EcsGroup;
}

/**
 * `User` is unlike most other fields which can be reused in multiple places
 * in that ECS places restrictions on which individual properties can be reused;
 *
 * Specifically, `changes`, `effective`, and `target` may be used if `user` is
 * placed at the root level, but not if it is nested inside another field like
 * `destination`. A more detailed explanation of these nuances can be found at:
 *
 * https://www.elastic.co/guide/en/ecs/master/ecs-user-usage.html
 *
 * As a result, we need to export a separate `NestedUser` type to import into
 * other interfaces internally. This contains the reusable subset of properties
 * from `User`.
 *
 * @internal
 */
export interface EcsNestedUser extends NestedFields {
  domain?: string;
  email?: string;
  full_name?: string;
  hash?: string;
  id?: string;
  name?: string;
  roles?: string[];
}

/**
 * @internal
 */
export interface EcsUser extends EcsNestedUser {
  changes?: EcsNestedUser;
  effective?: EcsNestedUser;
  target?: EcsNestedUser;
}
