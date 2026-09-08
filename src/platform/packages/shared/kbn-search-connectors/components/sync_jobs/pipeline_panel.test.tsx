/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import { PipelinePanel } from './pipeline_panel';

describe('PipelinePanel', () => {
  const pipeline = {
    extract_binary_content: true,
    name: 'my-pipeline',
    reduce_whitespace: true,
    run_ml_inference: true,
  };

  it('renders the pipeline heading and all settings', () => {
    renderWithKibanaRenderContext(<PipelinePanel pipeline={pipeline} />);

    expect(screen.getByRole('heading', { name: 'Pipeline' })).toBeInTheDocument();
    expect(screen.getByText('Pipeline name')).toBeInTheDocument();
    expect(screen.getByText('my-pipeline')).toBeInTheDocument();
    expect(screen.getByText('Extract binary content')).toBeInTheDocument();
    expect(screen.getByText('Reduce whitespace')).toBeInTheDocument();
    expect(screen.getByText('Machine learning inference')).toBeInTheDocument();
  });
});
