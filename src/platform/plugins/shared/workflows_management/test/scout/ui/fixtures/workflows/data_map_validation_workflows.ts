/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * data.map step using item and index in with.fields — should be valid.
 */
export const getDataMapWithItemAndIndex = () => `name: Data Map Validation
enabled: false
triggers:
  - type: manual
consts:
  items:
    - title: hello
    - title: world
steps:
  - name: map-step
    type: data.map
    items: "\${{ consts.items }}"
    with:
      fields:
        title: "\${{ item.title }}"
        pos: "\${{ index }}"`;

/**
 * data.map step referencing a non-existent variable — should be flagged.
 */
export const getDataMapWithInvalidVariable = () => `name: Data Map Validation
enabled: false
triggers:
  - type: manual
consts:
  items:
    - title: hello
steps:
  - name: map-step
    type: data.map
    items: "\${{ consts.items }}"
    with:
      fields:
        title: "\${{ item.title }}"
        bad: "\${{ nonexistent.field }}"`;
