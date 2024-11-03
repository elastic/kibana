/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface RulesSettingsModificationMetadata {
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RulesSettingsFlappingProperties {
  enabled: boolean;
  lookBackWindow: number;
  statusChangeThreshold: number;
}

export interface RuleSpecificFlappingProperties {
  lookBackWindow: number;
  statusChangeThreshold: number;
}

export type RulesSettingsFlapping = RulesSettingsFlappingProperties &
  RulesSettingsModificationMetadata;

export interface RulesSettingsQueryDelayProperties {
  delay: number;
}

export type RulesSettingsQueryDelay = RulesSettingsQueryDelayProperties &
  RulesSettingsModificationMetadata;

export interface RulesSettingsProperties {
  flapping?: RulesSettingsFlappingProperties;
  queryDelay?: RulesSettingsQueryDelayProperties;
}

export interface RulesSettings {
  flapping?: RulesSettingsFlapping;
  queryDelay?: RulesSettingsQueryDelay;
}
