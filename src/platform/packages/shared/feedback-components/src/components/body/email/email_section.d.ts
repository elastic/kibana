/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
export interface EmailSectionProps {
  email: string;
  allowEmailContact: boolean;
  handleChangeAllowEmailContact: (allow: boolean) => void;
  handleChangeEmail: (email: string) => void;
  onEmailValidationChange: (isValid: boolean) => void;
  getCurrentUserEmail: () => Promise<string | undefined>;
  forceShowEmailError?: boolean;
}
export declare const EmailSection: ({
  email,
  allowEmailContact,
  handleChangeAllowEmailContact,
  handleChangeEmail,
  onEmailValidationChange,
  getCurrentUserEmail,
  forceShowEmailError,
}: EmailSectionProps) => React.JSX.Element;
