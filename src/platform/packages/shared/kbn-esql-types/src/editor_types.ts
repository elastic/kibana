/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ESQLControlsContext {
  /** The editor supports the creation of controls,
   * This flag should be set to true to display the "Create control" suggestion
   **/
  supportsControls: boolean;
  /** Function to be called after the control creation **/
  onSaveControl: (controlState: Record<string, unknown>, updatedQuery: string) => Promise<void>;
  /** Function to be called after cancelling the control creation **/
  onCancelControl: () => void;
}

export interface ESQLRequestStats {
  /** Duration of the last query in milliseconds */
  durationInMs: number;
  /** Total number of documents processed in the last query */
  totalDocumentsProcessed: number;
  /** Timestamp of when the last query was run */
  lastRunAt: string;
}
