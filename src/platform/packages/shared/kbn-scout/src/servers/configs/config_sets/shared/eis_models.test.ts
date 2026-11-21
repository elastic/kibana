/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { getEisConnectorModels } from './eis_models';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
}));

jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo' }));

describe('getEisConnectorModels', () => {
  const model = (modelId: string, properties?: string[]) => ({
    inferenceId: `${modelId}-chat_completion`,
    modelId,
    ...(properties && { metadata: { heuristics: { properties } } }),
  });

  it('selects eligible models from an unfiltered discovery artifact', () => {
    const eligible = model('eligible', ['kibana-connector']);
    jest.mocked(readFileSync).mockReturnValueOnce(
      JSON.stringify({
        models: [
          model('untagged'),
          model('other', ['other']),
          model('efficient', ['kibana-connector', 'efficient']),
          model('ocr', ['kibana-connector', 'ocr-only']),
          eligible,
        ],
      })
    );

    expect(getEisConnectorModels()).toEqual([eligible]);
  });

  it('throws when discovery found models but none are eligible', () => {
    jest
      .mocked(readFileSync)
      .mockReturnValueOnce(
        JSON.stringify({ models: [model('untagged'), model('other', ['other'])] })
      );

    expect(() => getEisConnectorModels()).toThrow(
      'None of the 2 EIS models in /repo/target/eis_models.json are tagged "kibana-connector"'
    );
  });

  it('returns an empty list when discovery has not run', () => {
    jest.mocked(readFileSync).mockImplementationOnce(() => {
      throw new Error('ENOENT');
    });

    expect(getEisConnectorModels()).toEqual([]);
  });
});
