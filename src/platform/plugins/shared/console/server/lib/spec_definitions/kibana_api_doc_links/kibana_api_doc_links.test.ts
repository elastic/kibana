/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';
import { parse } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import { extractKibanaApiDocLinks } from './extract_kibana_api_doc_links';
import kibanaApiDocLinks from './kibana_api_doc_links.json';

const OAS_BUNDLE_PATH = Path.resolve(REPO_ROOT, 'oas_docs/output/kibana.yaml');

describe('kibana_api_doc_links.json', () => {
  it('is up to date with the Kibana OpenAPI bundle', () => {
    const oasDocument = parse(fs.readFileSync(OAS_BUNDLE_PATH, 'utf8'));
    const current = extractKibanaApiDocLinks(oasDocument);

    expect(kibanaApiDocLinks).toEqual(current);
  });
});
