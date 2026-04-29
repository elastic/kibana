/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLMessage } from '@kbn/esql-language';
import type { ESQLTelemetryCallbacks, ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '../../../../monaco_imports';

export type MonacoMessage = monaco.editor.IMarkerData & {
  code: string;
  underlinedWarning?: ESQLMessage['underlinedWarning'];
};

export type ESQLDependencies = ESQLCallbacks &
  Partial<{
    telemetry: ESQLTelemetryCallbacks;
    getEditorMessages?: () => { errors: MonacoMessage[]; warnings: MonacoMessage[] };
    getModelDependencies: (model: monaco.editor.ITextModel) => ESQLDependencies | undefined;
  }>;
