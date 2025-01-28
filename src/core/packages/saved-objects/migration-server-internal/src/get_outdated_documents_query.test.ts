/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOutdatedDocumentsQuery } from './get_outdated_documents_query';

describe('getOutdatedDocumentsQuery', () => {
  it.each`
    coreMigrationVersionPerType | migrationVersionPerType   | case
    ${{}}                       | ${{}}                     | ${'should not select documents if there are no migrations'}
    ${{ dashboard: '8.8.0' }}   | ${{}}                     | ${'should select documents with outdated core migration version'}
    ${{}}                       | ${{ dashboard: '7.7.0' }} | ${'should select documents with outdated type migration version'}
    ${{ dashboard: '8.8.0' }}   | ${{ dashboard: '7.7.0' }} | ${'should select documents with outdated both core and type migration versions'}
  `('$case', ({ coreMigrationVersionPerType, migrationVersionPerType }) => {
    expect(
      getOutdatedDocumentsQuery({
        coreMigrationVersionPerType,
        migrationVersionPerType,
      })
    ).toMatchSnapshot();
  });
});
