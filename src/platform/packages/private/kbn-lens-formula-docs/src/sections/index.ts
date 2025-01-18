/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchSection } from './elasticsearch';
import { commonFormulas } from './common';
import { comparisonSection } from './comparison';
import { mathSection } from './math';
import { calculationsSection } from './calculations';
import { contextSection } from './context';
import { howToSection } from './how_to';

export const sections = {
  howTo: howToSection,
  elasticsearch: elasticsearchSection,
  common: commonFormulas,
  comparison: comparisonSection,
  math: mathSection,
  calculations: calculationsSection,
  context: contextSection,
};
