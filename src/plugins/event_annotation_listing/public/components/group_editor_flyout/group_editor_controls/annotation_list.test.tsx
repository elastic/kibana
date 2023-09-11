/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PointInTimeEventAnnotationConfig } from '@kbn/event-annotation-common';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AnnotationList } from './annotation_list';

const annotation: PointInTimeEventAnnotationConfig = {
  id: 'some-different-annotation-id',
  label: 'some label',
  type: 'manual',
  key: {
    type: 'point_in_time',
    timestamp: 'timestamp2',
  },
};

describe('AnnotationList', () => {
  function getDefaultProps(): Parameters<typeof AnnotationList>[0] {
    return {
      annotations: [],
      selectAnnotation: jest.fn(),
      update: jest.fn(),
    };
  }

  it('should show delete action if more than two annotations', () => {
    render(<AnnotationList {...getDefaultProps()} annotations={[annotation, annotation]} />);
    expect(screen.queryAllByTestId('indexPattern-dimension-remove')).toHaveLength(2);
  });

  it('should hide delete action if less than two annotations', () => {
    render(<AnnotationList {...getDefaultProps()} annotations={[annotation]} />);
    expect(screen.queryByTestId('indexPattern-dimension-remove')).toBeNull();
  });
});
