/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { canShowSavedQuery } from './can_show_saved_query';

const core = coreMock.createStart();

function getCore(saveQueryManagementAllowed: boolean): typeof core {
  return {
    ...core,
    application: {
      ...core.application,
      capabilities: {
        ...core.application.capabilities,
        savedQueryManagement: { saveQuery: saveQueryManagementAllowed },
      },
    },
  };
}

const coreWithoutSavedQueryManagement = getCore(false);
const coreWithSavedQueryManagement = getCore(true);

const kqlQuery = {
  query: 'response:200',
  language: 'kuery',
};

const esqlQuery = {
  esql: 'from test | limit 10',
};

describe('canShowSaveQuery', () => {
  it('should return false if allowSavingQueries is not true', async () => {
    expect(
      canShowSavedQuery({
        core: coreWithSavedQueryManagement,
        query: kqlQuery,
      })
    );
  });

  it('should return true with saved query management privilege', async () => {
    expect(
      canShowSavedQuery({
        allowSavingQueries: true,
        core: coreWithSavedQueryManagement,
        query: kqlQuery,
      })
    ).toBe(true);
  });

  it('should return false without saved query management privilege', async () => {
    expect(
      canShowSavedQuery({
        allowSavingQueries: true,
        core: coreWithoutSavedQueryManagement,
        query: kqlQuery,
      })
    ).toBe(false);
  });

  it('should return false for ES|QL queries', async () => {
    expect(
      canShowSavedQuery({
        allowSavingQueries: true,
        core: coreWithSavedQueryManagement,
        query: esqlQuery,
      })
    ).toBe(false);
  });
});
