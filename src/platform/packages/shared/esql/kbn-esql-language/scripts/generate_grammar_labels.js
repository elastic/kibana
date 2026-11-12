/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Regenerates src/esql_js_sim/grammar/grammar_labels/grammar_labels.generated.ts from the
// installed grammar. Run from the Kibana root after an @elastic/esql upgrade.
require('@kbn/setup-node-env');
const {
  writeGrammarLabels,
} = require('../src/esql_js_sim/grammar/grammar_labels/write_grammar_labels');

process.stdout.write(`Wrote ${writeGrammarLabels()}\n`);
