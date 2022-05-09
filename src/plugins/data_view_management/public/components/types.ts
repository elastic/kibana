/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface IndexPatternCreationOption {
  text: string;
  description?: string;
  onClick: () => void;
}

export interface IndexPatternTableItem {
  id: string;
  title: string;
  default: boolean;
  tags?: Array<{ key: string; name: string }>;
  sort: string;
  namespaces?: string[];
}
