/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Fields for describing risk score and risk level of entities such as hosts and users.  These fields are not allowed to be nested under `event.*`. Please continue to use  `event.risk_score` and `event.risk_score_norm` for event risk.
 */
export interface EcsRisk {
  /**
   * A risk classification level calculated by an internal system as part of entity analytics and entity risk scoring.
   */
  calculated_level?: string;
  /**
   * A risk classification score calculated by an internal system as part of entity analytics and entity risk scoring.
   */
  calculated_score?: number;
  /**
   * A risk classification score calculated by an internal system as part of entity analytics and entity risk scoring, and normalized to a range of 0 to 100.
   */
  calculated_score_norm?: number;
  /**
   * A risk classification level obtained from outside the system, such as from some external Threat Intelligence Platform.
   */
  static_level?: string;
  /**
   * A risk classification score obtained from outside the system, such as from some external Threat Intelligence Platform.
   */
  static_score?: number;
  /**
   * A risk classification score obtained from outside the system, such as from some external Threat Intelligence Platform, and normalized to a range of 0 to 100.
   */
  static_score_norm?: number;
}
