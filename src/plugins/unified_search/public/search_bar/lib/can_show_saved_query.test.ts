/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { canShowSavedQuery } from './can_show_saved_query';

const core = coreMock.createStart();

function getCore(saveQueryGloballyAllowed: boolean): typeof core {
  return {
    ...core,
    application: {
      ...core.application,
      capabilities: {
        ...core.application.capabilities,
        savedQueryManagement: { saveQuery: saveQueryGloballyAllowed },
      },
    },
  };
}

const coreWithoutGlobalPrivilege = getCore(false);
const coreWithGlobalPrivilege = getCore(true);

const kqlQuery = {
  query: 'response:200',
  language: 'kuery',
};

const esqlQuery = {
  esql: 'from test | limit 10',
};

describe('canShowSaveQuery', () => {
  it('should allow when allowed_by_app_privilege', async () => {
    expect(
      canShowSavedQuery({
        core: coreWithoutGlobalPrivilege,
        query: kqlQuery,
        saveQueryMenuVisibility: 'allowed_by_app_privilege',
      })
    ).toBe(true);
  });

  it('should not allow for text-based queries when allowed_by_app_privilege', async () => {
    expect(
      canShowSavedQuery({
        core: coreWithoutGlobalPrivilege,
        query: esqlQuery,
        saveQueryMenuVisibility: 'allowed_by_app_privilege',
      })
    ).toBe(false);
  });

  it('should not allow for text-based queries when globally_managed', async () => {
    expect(
      canShowSavedQuery({
        core: coreWithGlobalPrivilege,
        query: esqlQuery,
        saveQueryMenuVisibility: 'globally_managed',
      })
    ).toBe(false);
  });

  it('should allow when globally allowed', async () => {
    expect(
      canShowSavedQuery({
        core: coreWithGlobalPrivilege,
        query: kqlQuery,
        saveQueryMenuVisibility: 'globally_managed',
      })
    ).toBe(true);
  });

  it('should not allow when globally disallowed', async () => {
    expect(
      canShowSavedQuery({
        core: coreWithoutGlobalPrivilege,
        query: kqlQuery,
        saveQueryMenuVisibility: 'globally_managed',
      })
    ).toBe(false);
  });

  it('should not allow when hidden', async () => {
    expect(
      canShowSavedQuery({
        core: coreWithGlobalPrivilege,
        query: kqlQuery,
        saveQueryMenuVisibility: 'hidden',
      })
    ).toBe(false);

    expect(
      canShowSavedQuery({
        core: coreWithGlobalPrivilege,
        query: kqlQuery,
        saveQueryMenuVisibility: undefined,
      })
    ).toBe(false);
  });
});
