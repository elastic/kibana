/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { IngestPipelinePanel } from './ingest_pipeline_panel';

describe('IngestPipelinePanel', () => {
  const setSelectedPipelineMock = jest.fn();

  const mockPipelineData = [
    {
      name: 'pipeline1',
      processors: ['processor1', 'processor2'],
      isManaged: true,
    },
    {
      name: 'pipeline2',
      processors: ['processor1'],
      isManaged: false,
    },
    {
      name: 'search-default-ingestion',
      processors: ['processor1', 'processor2', 'processor3'],
      isManaged: true,
    },
  ] as any;

  let exists: any;
  let find: any;

  beforeAll(async () => {
    const setup = registerTestBed(IngestPipelinePanel, {
      defaultProps: {
        setSelectedPipeline: setSelectedPipelineMock,
        ingestPipelineData: mockPipelineData,
      },
      memoryRouter: { wrapComponent: false },
    });

    await act(async () => {
      const testBed = setup();
      exists = testBed.exists;
      find = testBed.find;
    });
  });

  it('should display Process Data section', () => {
    expect(exists('ingestPipelinePanelTitle')).toBe(true);
    expect(find('ingestPipelinePanelTitle').contains('Preprocess your data')).toBe(true);
    expect(
      find('ingestPipelinePanelBody').contains(
        'You can use ingest pipelines to preprocess data before indexing into Elasticsearch.'
      )
    ).toBe(true);
    expect(find('ingestPipelinePanelTitle').find('.euiBadge__text').contains('Optional')).toBe(
      true
    );
  });

  it('should display number of processors', () => {
    find('ingestPipelinePanelSelect').simulate('click');
    expect(find('ingestPipelinePanelProcessors').at(0).contains('2 processors')).toBe(true);
    expect(find('ingestPipelinePanelProcessors').at(1).contains('1 processor')).toBe(true);
  });

  it('should display the badges correctly', () => {
    find('ingestPipelinePanelSelect').simulate('click');
    expect(
      find('ingestPipelinePanelProcessors').at(0).find('.euiBadge__text').contains('Managed')
    ).toBe(true);
    expect(
      find('ingestPipelinePanelProcessors').at(1).find('.euiBadge__text').contains('Managed')
    ).toBe(false);
    expect(
      find('ingestPipelinePanelProcessors').at(2).find('.euiBadge__text').contains('Recommended')
    ).toBe(true);
  });
});
