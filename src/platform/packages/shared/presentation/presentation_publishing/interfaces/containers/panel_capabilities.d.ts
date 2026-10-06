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
export declare const apiCanBeDuplicated: (unknownApi: unknown | null) => unknownApi is IsDuplicable;
export interface IsExpandable {
  isExpandable: boolean;
}
export declare const apiCanBeExpanded: (unknownApi: unknown | null) => unknownApi is IsExpandable;
export interface IsCustomizable {
  isCustomizable: boolean;
}
export declare const apiCanBeCustomized: (
  unknownApi: unknown | null
) => unknownApi is IsCustomizable;
export interface IsPinnable {
  isPinnable: boolean;
}
export declare const apiCanBePinned: (unknownApi: unknown | null) => unknownApi is IsPinnable;
export type HasPanelCapabilities = IsExpandable & IsCustomizable & IsDuplicable & IsPinnable;
