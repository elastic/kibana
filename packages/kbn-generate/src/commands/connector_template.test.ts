/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { LICENSE_TYPE } from '@kbn/licensing-types';

const TEMPLATE_PATH = Path.resolve(
  REPO_ROOT,
  'packages/kbn-generate/templates/connector/index.ts.ejs'
);

describe('connector scaffold template', () => {
  it('scaffolds a license the actions plugin accepts for a third party type', async () => {
    // The template is asserted as source rather than rendered: ejs compiles with
    // `new Function`, which the Jest preset disallows. `minimumLicense` is a
    // literal in the template, not an interpolated value, so the source is exact.
    const template = await Fsp.readFile(TEMPLATE_PATH, 'utf8');
    const minimumLicense = template.match(/minimumLicense: '(\w+)'/)?.[1];

    expect(minimumLicense).toBeDefined();
    expect(LICENSE_TYPE).toHaveProperty(minimumLicense as string);
    // `ensureSufficientLicense` in the actions plugin throws for a third party
    // action type below enterprise, which exits Kibana on startup. Only `.server-log`
    // and `.index` are exempt, and a scaffolded connector is never either.
    expect(LICENSE_TYPE[minimumLicense as keyof typeof LICENSE_TYPE]).toBeGreaterThanOrEqual(
      LICENSE_TYPE.enterprise
    );
  });
});
