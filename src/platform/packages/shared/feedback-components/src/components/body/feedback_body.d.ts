/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { FeedbackRegistryEntry } from '../../types';
export interface FeedbackBodyProps {
  selectedCsatOptionId: string;
  questionAnswers: Record<string, string>;
  allowEmailContact: boolean;
  email: string;
  questions: FeedbackRegistryEntry[];
  appTitle: string;
  handleChangeCsatOptionId: (optionId: string) => void;
  handleChangeQuestionAnswer: (questionId: string, answer: string) => void;
  handleChangeAllowEmailContact: (allow: boolean) => void;
  handleChangeEmail: (email: string) => void;
  onEmailValidationChange: (isValid: boolean) => void;
  getCurrentUserEmail: () => Promise<string | undefined>;
  forceShowEmailError?: boolean;
}
export declare const FeedbackBody: ({
  selectedCsatOptionId,
  questionAnswers,
  allowEmailContact,
  email,
  questions,
  appTitle,
  handleChangeCsatOptionId,
  handleChangeQuestionAnswer,
  handleChangeAllowEmailContact,
  handleChangeEmail,
  onEmailValidationChange,
  getCurrentUserEmail,
  forceShowEmailError,
}: FeedbackBodyProps) => React.JSX.Element;
