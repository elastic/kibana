/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Template } from '@kbn/workflows-library';

import { LibraryFetchError } from './errors';
import { resolveTemplateOrigin } from './resolve_template_origin';

const catalogRow: Template = {
  slug: 'triage-alerts',
  version: '1.2.0',
  availability: '>=9.5.0',
  name: 'Triage alerts',
  description: 'Triages alerts',
  categories: ['utility'],
  definitionUrl: 'templates/triage-alerts/1.2.0.yaml',
  contentHash: `sha256:${'0'.repeat(64)}`,
  stepTypes: [],
  triggerTypes: [],
};

const buildLibraryService = (templates: Template[]) => ({
  listTemplates: jest.fn().mockResolvedValue(templates),
});

describe('resolveTemplateOrigin', () => {
  it('keeps the slug and version of a catalog template', async () => {
    await expect(
      resolveTemplateOrigin({
        libraryService: buildLibraryService([catalogRow]),
        logger: loggerMock.create(),
        slug: 'triage-alerts',
        version: '1.1.0',
        origin: 'import',
      })
    ).resolves.toEqual({
      templateSlug: 'triage-alerts',
      templateVersion: '1.1.0',
      templateOrigin: 'import',
    });
  });

  it('stores a template outside the catalog as custom, without a version', async () => {
    await expect(
      resolveTemplateOrigin({
        libraryService: buildLibraryService([catalogRow]),
        logger: loggerMock.create(),
        slug: 'acme-internal-escalation',
        version: '1.0.0',
        origin: 'import',
      })
    ).resolves.toEqual({ templateSlug: 'custom', templateOrigin: 'import' });
  });

  it('stores the template as custom when the catalog cannot be read', async () => {
    const logger = loggerMock.create();
    const libraryService = {
      listTemplates: jest
        .fn()
        .mockRejectedValue(new LibraryFetchError('upstream down', 'unavailable', 'cdn')),
    };

    await expect(
      resolveTemplateOrigin({
        libraryService,
        logger,
        slug: 'triage-alerts',
        version: '1.2.0',
        origin: 'remix',
      })
    ).resolves.toEqual({ templateSlug: 'custom', templateOrigin: 'remix' });
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('upstream down'));
  });

  it('drops a version that is not valid semver', async () => {
    await expect(
      resolveTemplateOrigin({
        libraryService: buildLibraryService([catalogRow]),
        logger: loggerMock.create(),
        slug: 'triage-alerts',
        version: 'latest',
        origin: 'remix',
      })
    ).resolves.toEqual({ templateSlug: 'triage-alerts', templateOrigin: 'remix' });
  });
});
