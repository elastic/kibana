/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * FilterGroupBuilder: Fluent API for creating filter groups
 */

import type { FilterGroup, SimpleFilterCondition } from '@kbn/es-query-server';

export class FilterGroupBuilder {
  private group: Partial<FilterGroup> = {
    conditions: [],
  };

  constructor(type: 'AND' | 'OR' = 'AND') {
    this.group.type = type;
  }

  /**
   * Add a simple condition to the group
   */
  addCondition(condition: SimpleFilterCondition): this {
    this.group.conditions!.push(condition);
    return this;
  }

  /**
   * Add a nested group to this group
   */
  addGroup(nestedGroup: FilterGroup): this {
    this.group.conditions!.push(nestedGroup);
    return this;
  }

  /**
   * Add multiple conditions to the group
   */
  addConditions(conditions: SimpleFilterCondition[]): this {
    this.group.conditions!.push(...conditions);
    return this;
  }

  /**
   * Build and return the FilterGroup
   */
  build(): FilterGroup {
    if (!this.group.conditions?.length) {
      throw new Error('FilterGroup must have at least one condition');
    }

    return this.group as FilterGroup;
  }
}
