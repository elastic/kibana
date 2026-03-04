/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { dataAggregateStepCommonDefinition } from '../../../common/steps/data';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const dataAggregateStepDefinition: PublicStepDefinition = {
  ...dataAggregateStepCommonDefinition,
  label: 'Aggregate Collection',
  description: 'Group records and compute metrics like count, sum, avg, min, and max',
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/aggregate').then(({ icon }) => ({
      default: icon,
    }))
  ),
  actionsMenuGroup: ActionsMenuGroup.data,
  documentation: {
    details: `# Aggregate Collection

Group items by one or more keys and compute summary metrics per group.

## Supported Operations

- **count** - Number of items in each group (no field needed)
- **sum** - Sum of numeric values
- **avg** - Average of numeric values
- **min** - Minimum value (numbers and dates)
- **max** - Maximum value (numbers and dates)

## Basic Usage

\`\`\`yaml
- name: summarize-by-status
  type: data.aggregate
  items: "\${{ steps.fetch_tickets.output }}"
  with:
    group_by:
      - "status"
    metrics:
      - name: "count"
        operation: "count"
      - name: "avg_age"
        operation: "avg"
        field: "age_days"
      - name: "max_severity"
        operation: "max"
        field: "severity"
\`\`\`

## With Ordering and Limit

\`\`\`yaml
- name: top-categories
  type: data.aggregate
  items: "\${{ steps.fetch_products.output }}"
  with:
    group_by:
      - "category"
    metrics:
      - name: "count"
        operation: "count"
      - name: "total_revenue"
        operation: "sum"
        field: "price"
    order_by: "total_revenue"
    order: "desc"
    limit: 5
\`\`\`

## With Bucketed Aggregation

\`\`\`yaml
- name: age-distribution
  type: data.aggregate
  items: "\${{ steps.fetch_users.output }}"
  with:
    group_by:
      - "department"
    metrics:
      - name: "count"
        operation: "count"
    buckets:
      field: "age"
      ranges:
        - to: 30
          label: "junior"
        - from: 30
          to: 50
          label: "mid"
        - from: 50
          label: "senior"
\`\`\`

## Configuration

- **items** (required): Array of objects to aggregate
- **group_by** (required): Array of field names to group by
- **metrics** (required): Array of metric definitions (name, operation, field)
- **buckets** (optional): Numeric range bucketing config
- **order_by** (optional): Field name to sort results by
- **order** (optional): "asc" (default) or "desc"
- **limit** (optional): Maximum number of groups to return
`,
  },
};
