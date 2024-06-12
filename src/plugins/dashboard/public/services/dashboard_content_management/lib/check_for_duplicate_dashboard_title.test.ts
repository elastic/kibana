/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentClient } from '@kbn/content-management-plugin/public';
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

    (
      mockedContentManagementClient.search as jest.MockedFunction<ContentClient['search']>
    ).mockImplementationOnce(() =>
      Promise.resolve({
        hits: [
          {
            attributes: {
              title: newTitle,
            },
          },
        ],
        pagination: {
          total: 1,
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

    (
      mockedContentManagementClient.search as jest.MockedFunction<ContentClient['search']>
    ).mockImplementationOnce(() =>
      Promise.resolve({
        hits: [
          {
            attributes: {
              title: newTitle,
            },
          },
        ],
        pagination: {
          total: 1,
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

    (
      mockedContentManagementClient.search as jest.MockedFunction<ContentClient['search']>
    ).mockImplementationOnce(() =>
      Promise.resolve({
        hits: [
          {
            attributes: {
              title: newTitle,
            },
          },
        ],
        pagination: {
          total: 1,
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

    (
      mockedContentManagementClient.search as jest.MockedFunction<ContentClient['search']>
    ).mockImplementationOnce(() =>
      Promise.resolve({
        hits: [
          {
            attributes: {
              title: '',
            },
          },
        ],
        pagination: {
          total: 0,
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

  it('will perform a second search to self correct when the current page result does not contain the last duplicated dashboard', async () => {
    const [baseDashboardName] = extractTitleAndCount(newTitle);

    const searchLimit = 5;

    // pass a title with duplication count that doesn't follow the natural incremental cadence
    const duplicationId = searchLimit + 10;

    const firstPageResults = [{ attributes: { title: baseDashboardName } }].concat(
      Array.from(new Array(3)).map((_, idx) => ({
        attributes: {
          title: `${baseDashboardName} (${idx + 1})`,
        },
      })),
      { attributes: { title: `${baseDashboardName} (${searchLimit * 2})` } }
    );

    const secondPageResults = Array.from(new Array(2)).map((_, idx) => ({
      attributes: { title: `${baseDashboardName} (${searchLimit * 2 + idx + 1})` },
    }));

    const pageTotal = firstPageResults.length + secondPageResults.length;

    const userTitleInput = `${baseDashboardName} (${duplicationId})`;

    (mockedContentManagementClient.search as jest.MockedFunction<ContentClient['search']>)
      .mockImplementationOnce(() =>
        Promise.resolve({
          hits: firstPageResults,
          pagination: {
            total: pageTotal,
          },
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          hits: secondPageResults,
          pagination: {
            total: pageTotal,
          },
        })
      );

    await checkForDuplicateDashboardTitle(
      {
        title: userTitleInput,
        lastSavedTitle: baseDashboardName,
        copyOnSave: true,
        isTitleDuplicateConfirmed: false,
        searchLimit,
      },
      { client: mockedContentManagementClient } as ContentManagementStart
    );

    expect(mockedContentManagementClient.search).toHaveBeenCalledTimes(2);

    expect(mockedContentManagementClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          cursor: String(Math.ceil(duplicationId / searchLimit)),
        }),
      })
    );

    expect(mockedContentManagementClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          cursor: String(Math.ceil(pageTotal / searchLimit)),
        }),
      })
    );
  });

  it('invokes onTitleDuplicate with a speculative collision free value when the new title provided is a duplicate match', async () => {
    const searchLimit = 20;
    const searchResultTotal = 11;

    const [baseDashboardName] = extractTitleAndCount(newTitle);

    const onTitleDuplicate = jest.fn();

    const userTitleInput = `${baseDashboardName} (10)`;

    (
      mockedContentManagementClient.search as jest.MockedFunction<ContentClient['search']>
    ).mockImplementationOnce(() =>
      Promise.resolve({
        hits: [
          {
            attributes: {
              title: userTitleInput,
            },
          },
        ],
        pagination: {
          total: searchResultTotal,
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

    expect(onTitleDuplicate).toHaveBeenCalledWith(`${baseDashboardName} (${searchResultTotal})`);
  });
});
