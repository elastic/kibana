/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import html2canvas from 'html2canvas';
import { useScreenshot } from './use_screenshot';

jest.mock('html2canvas');

describe('useScreenshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div id="kibana-body">{children}</div>
  );

  it('returns null screenshot initially', () => {
    const { result } = renderHook(() => useScreenshot(), {
      wrapper: Wrapper,
    });
    expect(result.current.screenshot).toBeNull();
  });

  it('sets screenshot when generateScreenshot is called successfully', async () => {
    const mockCanvas = {
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockImageData'),
    };
    (html2canvas as jest.Mock).mockResolvedValue(mockCanvas);

    const { result } = renderHook(() => useScreenshot(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.generateScreenshot();
    });

    expect(html2canvas).toHaveBeenCalled();
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(result.current.screenshot).toBe('data:image/png;base64,mockImageData');
  });

  it('sets screenshot to null if an error occurs', async () => {
    (html2canvas as jest.Mock).mockRejectedValue(new Error('mock error'));

    const { result } = renderHook(() => useScreenshot(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.generateScreenshot();
    });

    expect(result.current.screenshot).toBeNull();
  });
});
