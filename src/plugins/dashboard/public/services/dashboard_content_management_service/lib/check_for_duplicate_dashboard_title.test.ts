/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { checkForDuplicateDashboardTitle } from './check_for_duplicate_dashboard_title';
import { extractTitleAndCount } from '../../../dashboard_container/embeddable/api/lib/extract_title_and_count';
import { contentManagementService } from '../../kibana_services';

describe('checkForDuplicateDashboardTitle', () => {
  const newTitle = 'Shiny dashboard (1)';

  afterEach(() => {
    jest.clearAllMocks();
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

    contentManagementService.client.search = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        hits: pageResults,
        pagination: {
          total: pageResults.length,
        },
      })
    );

    await checkForDuplicateDashboardTitle({
      title: newTitle,
      lastSavedTitle: baseDashboardName,
      copyOnSave: true,
      isTitleDuplicateConfirmed: false,
    });

    expect(contentManagementService.client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          text: `${baseDashboardName}*`,
        }),
      })
    );
  });

  it('invokes onTitleDuplicate with a speculative collision free value when the new title provided is a duplicate match', async () => {
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

    contentManagementService.client.search = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        hits: pageResults,
        pagination: {
          total: pageResults.length,
        },
      })
    );

    await checkForDuplicateDashboardTitle({
      title: userTitleInput,
      lastSavedTitle: baseDashboardName,
      copyOnSave: true,
      isTitleDuplicateConfirmed: false,
      onTitleDuplicate,
    });

    expect(contentManagementService.client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          text: 'Shiny dashboard*',
        }),
      })
    );

    expect(onTitleDuplicate).toHaveBeenCalledWith(`${baseDashboardName} (15)`);
  });
});
