/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface FeedbackQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface FeedbackSubmittedData {
  app_id: string;
  solution: string;
  allow_email_contact: boolean;
  url: string;
  user_email?: string;
  csat_score?: number;
  questions?: FeedbackQuestion[];
  organization_id?: string;
}

export type FeedbackFormData = Omit<FeedbackSubmittedData, 'solution' | 'organization_id'>;
