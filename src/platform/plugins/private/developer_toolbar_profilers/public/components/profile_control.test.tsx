/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { fetchProfilerStatus, startProfile, stopProfile } from '../lib/api';
import { downloadFile } from '../lib/download_file';
import { ProfileControl } from './profile_control';

jest.mock('../lib/download_file', () => ({ downloadFile: jest.fn() }));
jest.mock('../lib/api', () => ({
  fetchProfilerStatus: jest.fn(),
  startProfile: jest.fn(),
  stopProfile: jest.fn(),
}));

const mockDownloadFile = downloadFile as jest.MockedFunction<typeof downloadFile>;
const mockFetchProfilerStatus = fetchProfilerStatus as jest.MockedFunction<
  typeof fetchProfilerStatus
>;
const mockStartProfile = startProfile as jest.MockedFunction<typeof startProfile>;
const mockStopProfile = stopProfile as jest.MockedFunction<typeof stopProfile>;

function mockCpuRunning(isRunning: boolean) {
  mockFetchProfilerStatus.mockResolvedValue({
    cpu: { isRunning },
    memory: { isRunning: false },
  });
}

async function renderControl() {
  const { http, notifications } = coreMock.createStart();
  render(<ProfileControl type="cpu" http={http} toasts={notifications.toasts} />);
  await waitFor(() => expect(mockFetchProfilerStatus).toHaveBeenCalled());
  return { toasts: notifications.toasts };
}

function getButton() {
  return screen.getByTestId('serverProfilers-cpu-button');
}

describe('ProfileControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a stop button when a profile is already running on the server', async () => {
    mockCpuRunning(true);
    await renderControl();

    await waitFor(() => expect(getButton()).toHaveTextContent('Stop CPU profile'));
  });

  it('starts a profile and turns into a stop button', async () => {
    mockCpuRunning(false);
    mockStartProfile.mockResolvedValue(undefined);
    await renderControl();
    expect(getButton()).toHaveTextContent('CPU profile');

    fireEvent.click(getButton());

    await waitFor(() => expect(getButton()).toHaveTextContent('Stop CPU profile'));
    expect(mockStartProfile).toHaveBeenCalledWith(expect.anything(), 'cpu');
  });

  it('stops a profile and saves the profile file', async () => {
    mockCpuRunning(true);
    const file = {
      fileName: 'kibana-cpu-profile-2026-11-02_11-28.cpuprofile',
      blob: new Blob(['{}']),
    };
    mockStopProfile.mockResolvedValue(file);
    await renderControl();
    await waitFor(() => expect(getButton()).toHaveTextContent('Stop CPU profile'));

    fireEvent.click(getButton());

    await waitFor(() => expect(getButton()).not.toHaveTextContent('Stop'));
    expect(mockStopProfile).toHaveBeenCalledWith(expect.anything(), 'cpu');
    expect(mockDownloadFile).toHaveBeenCalledWith(file);
  });

  it('reports a failure and resyncs with the server status', async () => {
    mockCpuRunning(false);
    mockStartProfile.mockRejectedValue(new Error('A cpu profile is already running'));
    const { toasts } = await renderControl();
    mockCpuRunning(true);

    fireEvent.click(getButton());

    await waitFor(() => expect(getButton()).toHaveTextContent('Stop CPU profile'));
    expect(toasts.addError).toHaveBeenCalledWith(
      new Error('A cpu profile is already running'),
      expect.objectContaining({ title: 'Unable to start the CPU profile' })
    );
  });
});
