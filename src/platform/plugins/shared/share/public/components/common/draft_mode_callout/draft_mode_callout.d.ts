/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { CommonProps } from '@elastic/eui';
export interface SaveButtonProps extends CommonProps {
  onSave: () => Promise<void>;
  label?: string;
  isSaving?: boolean;
}
export interface DraftModeCalloutProps extends CommonProps {
  message?: string;
  saveButtonProps?: SaveButtonProps;
}
/**
 * A warning callout to indicate the user has unsaved changes.
 */
export declare const DraftModeCallout: ({
  message,
  ['data-test-subj']: dataTestSubj,
  saveButtonProps,
}: DraftModeCalloutProps) => React.JSX.Element;
