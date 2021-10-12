/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isInlineScriptingDisabledMock } from './scripting_disabled_deprecation.test.mocks';
import { elasticsearchServiceMock } from '../../elasticsearch/elasticsearch_service.mock';
import { getScriptingDisabledDeprecations } from './scripting_disabled_deprecation';

describe('getScriptingDisabledDeprecations', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient();
  });

  afterEach(() => {
    isInlineScriptingDisabledMock.mockReset();
  });

  it('calls `isInlineScriptingDisabled` with the correct arguments', async () => {
    await getScriptingDisabledDeprecations({
      esClient,
    });

    expect(isInlineScriptingDisabledMock).toHaveBeenCalledTimes(1);
    expect(isInlineScriptingDisabledMock).toHaveBeenCalledWith({
      client: esClient.asInternalUser,
    });
  });

  it('returns no deprecations if scripting is not disabled', async () => {
    isInlineScriptingDisabledMock.mockResolvedValue(false);

    const deprecations = await getScriptingDisabledDeprecations({
      esClient,
    });

    expect(deprecations).toHaveLength(0);
  });

  it('returns a deprecation if scripting is disabled', async () => {
    isInlineScriptingDisabledMock.mockResolvedValue(true);

    const deprecations = await getScriptingDisabledDeprecations({
      esClient,
    });

    expect(deprecations).toHaveLength(1);
    expect(deprecations[0]).toEqual({
      title: expect.any(String),
      message: expect.any(String),
      level: 'critical',
      requireRestart: false,
      correctiveActions: {
        manualSteps: expect.any(Array),
      },
    });
  });
});
