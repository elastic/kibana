/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { IngestPipelinePanel } from './ingest_pipeline_panel';

const DEFAULT_INGESTION_PIPELINE = 'default-ingestion-pipeline';

describe('IngestPipelinePanel', () => {
  const setSelectedPipelineMock = jest.fn();

  const mockPipelineData = {
    pipeline1: {
      processors: ['processor1', 'processor2'],
      _meta: {
        managed: true,
      },
    },
    pipeline2: {
      processors: ['processor1'],
      _meta: {
        managed: false,
      },
    },
    [DEFAULT_INGESTION_PIPELINE]: {
      processors: ['processor1', 'processor2', 'processor3'],
      _meta: {
        managed: true,
      },
    },
    deprecated_pipeline: {
      processors: ['processor1'],
      _meta: {
        managed: false,
      },
      deprecated: true,
    },
  } as any;

  let exists: any;
  let find: any;

  beforeAll(async () => {
    const setup = registerTestBed(IngestPipelinePanel, {
      defaultProps: {
        setSelectedPipeline: setSelectedPipelineMock,
        ingestPipelinesData: mockPipelineData,
        defaultIngestPipeline: DEFAULT_INGESTION_PIPELINE,
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
    expect(find('ingestPipelinePanelOptions').at(0).contains('3 processors')).toBe(true);
    expect(find('ingestPipelinePanelOptions').at(1).contains('2 processors')).toBe(true);
    expect(find('ingestPipelinePanelOptions').at(2).contains('1 processor')).toBe(true);
  });

  it('should display the badges correctly', () => {
    find('ingestPipelinePanelSelect').simulate('click');
    expect(
      find('ingestPipelinePanelOptions').at(0).find('.euiBadge__text').contains('Recommended')
    ).toBe(true);
    expect(
      find('ingestPipelinePanelOptions').at(1).find('.euiBadge__text').contains('Managed')
    ).toBe(true);
    expect(
      find('ingestPipelinePanelOptions').at(2).find('.euiBadge__text').contains('Managed')
    ).toBe(false);
  });

  it('should display only active pipelines', () => {
    find('ingestPipelinePanelSelect').simulate('click');
    expect(find('ingestPipelinePanelOptionTitle').contains('pipeline1')).toBe(true);
    expect(find('ingestPipelinePanelOptionTitle').contains('deprecated_pipeline')).toBe(false);
  });

  it('should display the recommended pipeline at the beginning', () => {
    find('ingestPipelinePanelSelect').simulate('click');
    expect(find('ingestPipelinePanelOptionTitle').at(0).contains(DEFAULT_INGESTION_PIPELINE)).toBe(
      true
    );
  });

  describe('when there exists no ingest pipeline', () => {
    it('should display an empty list of pipelines', () => {
      find('ingestPipelinePanelSelect').simulate('click');
      expect(exists('ingestPipelinePanelOptions')).toBe(false);
    });
  });
});
