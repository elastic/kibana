/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TraceWaterfall } from '.';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';

jest.mock('../../../../../plugin', () => ({
  getUnifiedDocViewerServices: () => ({
    data: {
      query: {
        timefilter: {
          timefilter: {
            getAbsoluteTime: () => ({ from: '2024-01-01', to: '2024-01-02' }),
          },
        },
      },
    },
  }),
}));

jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: () => <div data-test-subj="embeddable-renderer" />,
}));

jest.mock('../full_screen_waterfall', () => ({
  FullScreenWaterfall: () => null,
}));

jest.mock('./full_screen_waterfall_tour_step', () => ({
  TraceWaterfallTourStep: () => null,
}));

jest.mock('../../../../..', () => ({
  ContentFrameworkSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('TraceWaterfall', () => {
  const dataView = createStubDataView({
    spec: {
      id: 'test-dataview',
      title: 'test-pattern',
      timeFieldName: '@timestamp',
    },
  });

  it('wraps EmbeddableRenderer with CSS override for proper layout', () => {
    const { container } = render(<TraceWaterfall traceId="test-trace" dataView={dataView} />);

    const embeddable = container.querySelector('[data-test-subj="embeddable-renderer"]');
    expect(embeddable).toBeInTheDocument();

    // Verify the wrapper exists with the CSS override
    const wrapper = embeddable?.parentElement;
    expect(wrapper).toHaveStyleRule('width', '100%');
    expect(wrapper).toHaveStyleRule('display', 'block', {
      target: '.embPanel__content',
    });
  });
});
