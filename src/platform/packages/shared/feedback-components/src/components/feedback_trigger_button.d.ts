/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { FeedbackFormData, FeedbackRegistryEntry } from '../types';
interface Props {
  getQuestions: (appId: string) => Promise<FeedbackRegistryEntry[]>;
  getAppDetails: () => {
    title: string;
    id: string;
    url: string;
  };
  getCurrentUserEmail: () => Promise<string | undefined>;
  sendFeedback: (data: FeedbackFormData) => Promise<void>;
  showToast: (title: string, type: 'success' | 'error') => void;
  checkTelemetryOptIn: () => Promise<boolean>;
}
export declare const FeedbackTriggerButton: ({
  getQuestions,
  getAppDetails,
  getCurrentUserEmail,
  sendFeedback,
  showToast,
  checkTelemetryOptIn,
}: Props) => React.JSX.Element;
export {};
