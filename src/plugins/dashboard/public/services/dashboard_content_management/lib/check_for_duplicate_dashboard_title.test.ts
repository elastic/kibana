/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentClient } from '@kbn/content-management-plugin/public';
import type { DashboardCrudTypes } from '../../../../common/content_management';
import { checkForDuplicateDashboardTitle } from './check_for_duplicate_dashboard_title';
import { extractTitleAndCount } from '../../../dashboard_container/embeddable/api/lib/extract_title_and_count';

type ContentManagementStart = Parameters<typeof checkForDuplicateDashboardTitle>[1];

describe('checkForDuplicateDashboardTitle', () => {
  const mockedContentManagementClient = {
    search: jest.fn(),
  } as unknown as ContentClient;

  const newTitle = 'Shiny dashboard (1)';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses the passed searchLimit when performing name collision check', async () => {
    const [baseDashboardName] = extractTitleAndCount(newTitle);

    const pageResults = [
      {
        attributes: {
          title: baseDashboardName,
        },
      },
    ];

    (
      mockedContentManagementClient.search as jest.MockedFunction<ContentClient['search']>
    ).mockImplementationOnce(() =>
      Promise.resolve({
        hits: pageResults,
        pagination: {
          total: pageResults.length,
        },
      })
    );

    await checkForDuplicateDashboardTitle(
      {
        title: newTitle,
        lastSavedTitle: baseDashboardName,
        copyOnSave: true,
        isTitleDuplicateConfirmed: false,
        searchLimit: 20,
      },
      { client: mockedContentManagementClient } as ContentManagementStart
    );

    expect(mockedContentManagementClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          limit: 20,
        }),
      })
    );
  });

  it('will only search using the dashboard basename', async () => {
    const [baseDashboardName] = extractTitleAndCount(newTitle);

    const pageResults = [
      {
        attributes: {
          title: baseDashboardName,
        },
      },
    ];

    (
      mockedContentManagementClient.search as jest.MockedFunction<ContentClient['search']>
    ).mockImplementationOnce(() =>
      Promise.resolve({
        hits: pageResults,
        pagination: {
          total: pageResults.length,
        },
      })
    );

    await checkForDuplicateDashboardTitle(
      {
        title: newTitle,
        lastSavedTitle: baseDashboardName,
        copyOnSave: true,
        isTitleDuplicateConfirmed: false,
      },
      { client: mockedContentManagementClient } as ContentManagementStart
    );

    expect(mockedContentManagementClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          text: `${baseDashboardName}*`,
        }),
      })
    );
  });

  it('will by default search using a cursor determined by the provided search limit and the duplication count', async () => {
    const [baseDashboardName, duplicationCount] = extractTitleAndCount(newTitle);

    const searchLimit = 5;

    const pageResults = [
      {
        attributes: {
          title: baseDashboardName,
        },
      },
    ];

    (
      mockedContentManagementClient.search as jest.MockedFunction<ContentClient['search']>
    ).mockImplementationOnce(() =>
      Promise.resolve({
        hits: pageResults,
        pagination: {
          total: pageResults.length,
        },
      })
    );

    await checkForDuplicateDashboardTitle(
      {
        title: newTitle,
        lastSavedTitle: baseDashboardName,
        copyOnSave: true,
        isTitleDuplicateConfirmed: false,
        searchLimit,
      },
      { client: mockedContentManagementClient } as ContentManagementStart
    );

    expect(mockedContentManagementClient.search).toHaveBeenCalledTimes(1);

    expect(mockedContentManagementClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          cursor: String(Math.ceil(duplicationCount / searchLimit)),
        }),
      })
    );
  });

  it('will by default search using a cursor of 1 when we can not determine the duplication count', async () => {
    const [baseDashboardName] = extractTitleAndCount(newTitle);

    const searchLimit = 10;

    const pageResults: DashboardCrudTypes['SearchOut']['hits'] = [];

    (
      mockedContentManagementClient.search as jest.MockedFunction<ContentClient['search']>
    ).mockImplementationOnce(() =>
      Promise.resolve({
        hits: pageResults,
        pagination: {
          total: pageResults.length,
        },
      })
    );

    await checkForDuplicateDashboardTitle(
      {
        title: baseDashboardName,
        lastSavedTitle: '',
        copyOnSave: true,
        isTitleDuplicateConfirmed: false,
        searchLimit,
      },
      { client: mockedContentManagementClient } as ContentManagementStart
    );

    expect(mockedContentManagementClient.search).toHaveBeenCalledTimes(1);

    expect(mockedContentManagementClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          cursor: String(1),
        }),
      })
    );
  });

  it('invokes onTitleDuplicate with a speculative collision free value when the new title provided is a duplicate match', async () => {
    const searchLimit = 20;

    const [baseDashboardName] = extractTitleAndCount(newTitle);

    const userTitleInput = `${baseDashboardName} (10)`;

    const pageResults = [
      {
        attributes: {
          title: baseDashboardName,
        },
      },
    ].concat(
      Array.from(new Array(5)).map((_, idx) => ({
        attributes: {
          title: `${baseDashboardName} (${10 + idx})`,
        },
      }))
    );

    const onTitleDuplicate = jest.fn();

    (
      mockedContentManagementClient.search as jest.MockedFunction<ContentClient['search']>
    ).mockImplementationOnce(() =>
      Promise.resolve({
        hits: pageResults,
        pagination: {
          total: pageResults.length,
        },
      })
    );

    await checkForDuplicateDashboardTitle(
      {
        title: userTitleInput,
        searchLimit,
        lastSavedTitle: baseDashboardName,
        copyOnSave: true,
        isTitleDuplicateConfirmed: false,
        onTitleDuplicate,
      },
      { client: mockedContentManagementClient } as ContentManagementStart
    );

    expect(mockedContentManagementClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          text: 'Shiny dashboard*',
        }),
      })
    );

    expect(onTitleDuplicate).toHaveBeenCalledWith(`${baseDashboardName} (15)`);
  });
});
