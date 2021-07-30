/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternFieldBase } from '@kbn/es-query';
import { IndexPatternField } from '../../../../../../plugins/data/public';

type IndexedFieldItemBase = Partial<IndexPatternField> & IndexPatternFieldBase;

export interface IndexedFieldItem extends IndexedFieldItemBase {
  info: string[];
  excluded: boolean;
  kbnType: string;
  isMapped: boolean;
  hasRuntime: boolean;
}
