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
import {
  GenAiTabImpression,
  GENAI_TAB_IMPRESSION_EVENT_TYPE,
  registerGenAiTabImpressionEventType,
} from './genai_tab_impression';

describe('GenAiTabImpression', () => {
  it('reports an impression on mount', () => {
    const reportEvent = jest.fn();

    render(<GenAiTabImpression reportEvent={reportEvent} element="spanFlyoutTabs" />);

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent).toHaveBeenCalledWith(GENAI_TAB_IMPRESSION_EVENT_TYPE, {
      element: 'spanFlyoutTabs',
    });
  });

  it('does not report again on re-render with the same element and resourceId', () => {
    const reportEvent = jest.fn();

    const { rerender } = render(
      <GenAiTabImpression reportEvent={reportEvent} element="spanFlyoutTabs" resourceId="span-1" />
    );
    rerender(
      <GenAiTabImpression reportEvent={reportEvent} element="spanFlyoutTabs" resourceId="span-1" />
    );

    expect(reportEvent).toHaveBeenCalledTimes(1);
  });

  it('reports a new impression when the resourceId changes', () => {
    const reportEvent = jest.fn();

    const { rerender } = render(
      <GenAiTabImpression reportEvent={reportEvent} element="spanFlyoutTabs" resourceId="span-1" />
    );
    rerender(
      <GenAiTabImpression reportEvent={reportEvent} element="spanFlyoutTabs" resourceId="span-2" />
    );

    expect(reportEvent).toHaveBeenCalledTimes(2);
  });

  it('swallows reporting errors', () => {
    const reportEvent = jest.fn(() => {
      throw new Error('not registered');
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      render(<GenAiTabImpression reportEvent={reportEvent} element="spanFlyoutTabs" />)
    ).not.toThrow();
  });
});

describe('registerGenAiTabImpressionEventType', () => {
  it('registers the impression event type', () => {
    const registerEventType = jest.fn();

    registerGenAiTabImpressionEventType({ registerEventType });

    expect(registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: GENAI_TAB_IMPRESSION_EVENT_TYPE })
    );
  });
});
