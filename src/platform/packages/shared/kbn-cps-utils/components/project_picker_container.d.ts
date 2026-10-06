/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ICPSManager } from '../types';
interface ProjectPickerContainerProps {
  cpsManager: ICPSManager;
}
/**
 * Container component that connects ProjectPicker to CPSManager.
 * Delegates to ActiveProjectPicker or DisabledProjectPicker based on access level,
 * so the fetch hook only runs when the picker is actually active.
 */
export declare const ProjectPickerContainer: React.FC<ProjectPickerContainerProps>;
export {};
