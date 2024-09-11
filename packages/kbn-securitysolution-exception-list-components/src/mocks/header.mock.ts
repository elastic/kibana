/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const handleEdit = jest.fn();
export const handleDelete = jest.fn();
export const actions = [
  {
    key: 'edit',
    icon: 'pencil',
    label: 'Edit detection exception',
    onClick: handleEdit,
  },
  {
    key: 'delete',
    icon: 'trash',
    label: 'Delete detection exception',
    onClick: handleDelete,
  },
];
export const actionsWithDisabledDelete = [
  {
    key: 'edit',
    icon: 'pencil',
    label: 'Edit detection exception',
    onClick: handleEdit,
  },
  {
    key: 'delete',
    icon: 'trash',
    disabled: true,
    label: 'Delete detection exception',
    onClick: handleDelete,
  },
];
