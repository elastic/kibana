/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** The document `initialize()` writes; shared by the whole deployment, so the last instance to run wins. */
export interface PluginInitializeExampleDoc {
  /** UUID of the Kibana instance whose `initialize()` last wrote the document. */
  instanceUuid: string;
  initializedAt: string;
  /** Which attempt succeeded on that instance, counting from 1. */
  attempt: number;
}
