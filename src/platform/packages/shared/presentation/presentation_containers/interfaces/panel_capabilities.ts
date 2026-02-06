/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface IsDuplicable {
  isDuplicable: boolean;
}

export const apiCanBeDuplicated = (unknownApi: unknown | null): unknownApi is IsDuplicable =>
  Boolean((unknownApi as IsDuplicable).isDuplicable);

export interface IsExpandable {
  isExpandable: boolean;
}
export const apiCanBeExpanded = (unknownApi: unknown | null): unknownApi is IsExpandable =>
  Boolean((unknownApi as IsExpandable).isExpandable);

export interface IsCustomizable {
  isCustomizable: boolean;
}
export const apiCanBeCustomized = (unknownApi: unknown | null): unknownApi is IsCustomizable =>
  Boolean((unknownApi as IsCustomizable).isCustomizable);

export interface IsPinnable {
  isPinnable: boolean;
}

export const apiCanBePinned = (unknownApi: unknown | null): unknownApi is IsPinnable =>
  Boolean((unknownApi as IsPinnable).isPinnable);

export type HasPanelCapabilities = IsExpandable & IsCustomizable & IsDuplicable & IsPinnable;
