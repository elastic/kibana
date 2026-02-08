/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const force: boolean = require('./force')(process.argv);

const uid: number | undefined = process.getuid && process.getuid();
const isRoot: boolean = require('./is_root')(uid);

if (isRoot && !force) {
  console.error('Kibana should not be run as root.  Use --allow-root to continue.');
  process.exit(1);
}
