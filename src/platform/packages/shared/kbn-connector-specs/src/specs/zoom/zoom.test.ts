/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Zoom } from './zoom';

interface ZoomPaginatedResponse<T = unknown> {
  page_size?: number;
  next_page_token?: string;
  total_records?: number;
  meetings?: T[];
  participants?: T[];
}

interface TestResult {
  ok: boolean;
  message?: string;
}

describe('Zoom', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listMeetings action', () => {
    it('should list upcoming meetings with default params', async () => {
      const mockResponse = {
        data: {
          page_size: 30,
          total_records: 2,
          meetings: [
            { id: 111, topic: 'Standup', start_time: '2026-02-26T09:00:00Z' },
            { id: 222, topic: 'Retrospective', start_time: '2026-02-27T14:00:00Z' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Zoom.actions.listMeetings.handler(mockContext, {
        userId: 'me',
        type: 'upcoming',
      })) as ZoomPaginatedResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.zoom.us/v2/users/me/meetings',
        { params: { type: 'upcoming' } }
      );
      expect(result).toEqual(mockResponse.data);
      expect(result.meetings).toHaveLength(2);
    });

    it('should pass pagination params when provided', async () => {
      const mockResponse = { data: { meetings: [], total_records: 0 } };
      mockClient.get.mockResolvedValue(mockResponse);

      await Zoom.actions.listMeetings.handler(mockContext, {
        userId: 'user@example.com',
        type: 'scheduled',
        pageSize: 10,
        nextPageToken: 'token123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.zoom.us/v2/users/user%40example.com/meetings',
        {
          params: {
            type: 'scheduled',
            page_size: 10,
            next_page_token: 'token123',
          },
        }
      );
    });

    it('should handle empty meeting list', async () => {
      const mockResponse = { data: { meetings: [], total_records: 0 } };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Zoom.actions.listMeetings.handler(mockContext, {
        userId: 'me',
        type: 'upcoming',
      })) as ZoomPaginatedResponse;

      expect(result.meetings).toHaveLength(0);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        Zoom.actions.listMeetings.handler(mockContext, { userId: 'me', type: 'upcoming' })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getMeetingRecordings action', () => {
    it('should get recordings for a meeting', async () => {
      const mockResponse = {
        data: {
          uuid: 'abc123',
          id: 111,
          topic: 'Team Standup',
          recording_files: [
            {
              id: 'rec-1',
              recording_type: 'audio_transcript',
              file_type: 'VTT',
              download_url: 'https://zoom.us/rec/download/transcript.vtt',
              status: 'completed',
            },
            {
              id: 'rec-2',
              recording_type: 'chat_file',
              file_type: 'TXT',
              download_url: 'https://zoom.us/rec/download/chat.txt',
              status: 'completed',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Zoom.actions.getMeetingRecordings.handler(mockContext, {
        meetingId: '111',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.zoom.us/v2/meetings/111/recordings'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should double-encode a UUID that starts with /', async () => {
      const mockResponse = { data: { recording_files: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await Zoom.actions.getMeetingRecordings.handler(mockContext, {
        meetingId: '/abc+123==',
      });

      const expectedId = encodeURIComponent(encodeURIComponent('/abc+123=='));
      expect(mockClient.get).toHaveBeenCalledWith(
        `https://api.zoom.us/v2/meetings/${expectedId}/recordings`
      );
    });

    it('should handle meeting with no recordings', async () => {
      const mockResponse = { data: { recording_files: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Zoom.actions.getMeetingRecordings.handler(mockContext, {
        meetingId: '111',
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Meeting not found'));

      await expect(
        Zoom.actions.getMeetingRecordings.handler(mockContext, { meetingId: '999' })
      ).rejects.toThrow('Meeting not found');
    });
  });

  describe('listUserRecordings action', () => {
    it('should list recordings with date range', async () => {
      const mockResponse = {
        data: {
          from: '2026-02-01',
          to: '2026-02-28',
          total_records: 1,
          meetings: [
            {
              id: 111,
              topic: 'Standup',
              recording_files: [
                { id: 'rec-1', recording_type: 'audio_transcript' },
              ],
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Zoom.actions.listUserRecordings.handler(mockContext, {
        userId: 'me',
        from: '2026-02-01',
        to: '2026-02-28',
      })) as ZoomPaginatedResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.zoom.us/v2/users/me/recordings',
        { params: { from: '2026-02-01', to: '2026-02-28' } }
      );
      expect(result.meetings).toHaveLength(1);
    });

    it('should omit optional params when not provided', async () => {
      const mockResponse = { data: { meetings: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await Zoom.actions.listUserRecordings.handler(mockContext, { userId: 'me' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.zoom.us/v2/users/me/recordings',
        { params: {} }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Rate limited'));

      await expect(
        Zoom.actions.listUserRecordings.handler(mockContext, { userId: 'me' })
      ).rejects.toThrow('Rate limited');
    });
  });

  describe('downloadRecordingFile action', () => {
    it('should download and return file content as text', async () => {
      const vttContent = 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:05.000\nHello everyone.';
      const mockResponse = {
        data: Buffer.from(vttContent),
        headers: { 'content-type': 'text/vtt' },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Zoom.actions.downloadRecordingFile.handler(mockContext, {
        downloadUrl: 'https://zoom.us/rec/download/transcript.vtt',
      })) as { contentType?: string; text: string };

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://zoom.us/rec/download/transcript.vtt',
        { responseType: 'arraybuffer' }
      );
      expect(result.contentType).toBe('text/vtt');
      expect(result.text).toBe(vttContent);
    });

    it('should handle chat log download', async () => {
      const chatContent = '10:00:01 From Matt: Hi team!\n10:00:05 From Sara: Hey!';
      const mockResponse = {
        data: Buffer.from(chatContent),
        headers: { 'content-type': 'text/plain' },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Zoom.actions.downloadRecordingFile.handler(mockContext, {
        downloadUrl: 'https://zoom.us/rec/download/chat.txt',
      })) as { contentType?: string; text: string };

      expect(result.contentType).toBe('text/plain');
      expect(result.text).toContain('Hi team!');
    });

    it('should handle missing content-type header', async () => {
      const mockResponse = {
        data: Buffer.from('some content'),
        headers: {},
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Zoom.actions.downloadRecordingFile.handler(mockContext, {
        downloadUrl: 'https://zoom.us/rec/download/file',
      })) as { contentType?: string; text: string };

      expect(result.contentType).toBeUndefined();
      expect(result.text).toBe('some content');
    });

    it('should propagate download errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        Zoom.actions.downloadRecordingFile.handler(mockContext, {
          downloadUrl: 'https://zoom.us/rec/download/expired.vtt',
        })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('getMeetingParticipants action', () => {
    it('should list participants of a past meeting', async () => {
      const mockResponse = {
        data: {
          total_records: 2,
          participants: [
            {
              id: 'p-1',
              name: 'Alice',
              user_email: 'alice@example.com',
              join_time: '2026-02-25T09:00:00Z',
              leave_time: '2026-02-25T09:30:00Z',
              duration: 1800,
            },
            {
              id: 'p-2',
              name: 'Bob',
              user_email: 'bob@example.com',
              join_time: '2026-02-25T09:02:00Z',
              leave_time: '2026-02-25T09:30:00Z',
              duration: 1680,
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Zoom.actions.getMeetingParticipants.handler(mockContext, {
        meetingId: '111',
      })) as ZoomPaginatedResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.zoom.us/v2/past_meetings/111/participants',
        { params: {} }
      );
      expect(result.participants).toHaveLength(2);
    });

    it('should double-encode a UUID containing //', async () => {
      const mockResponse = { data: { participants: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await Zoom.actions.getMeetingParticipants.handler(mockContext, {
        meetingId: 'abc//123==',
      });

      const expectedId = encodeURIComponent(encodeURIComponent('abc//123=='));
      expect(mockClient.get).toHaveBeenCalledWith(
        `https://api.zoom.us/v2/past_meetings/${expectedId}/participants`,
        { params: {} }
      );
    });

    it('should pass pagination params', async () => {
      const mockResponse = { data: { participants: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await Zoom.actions.getMeetingParticipants.handler(mockContext, {
        meetingId: '111',
        pageSize: 50,
        nextPageToken: 'page2',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.zoom.us/v2/past_meetings/111/participants',
        { params: { page_size: 50, next_page_token: 'page2' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Meeting does not exist'));

      await expect(
        Zoom.actions.getMeetingParticipants.handler(mockContext, { meetingId: '999' })
      ).rejects.toThrow('Meeting does not exist');
    });
  });

  describe('test handler', () => {
    it('should return success with full name', async () => {
      const mockResponse = {
        data: { first_name: 'Matt', last_name: 'Nowzari', email: 'matt@example.com' },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!Zoom.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Zoom.test.handler(mockContext)) as TestResult;

      expect(mockClient.get).toHaveBeenCalledWith('https://api.zoom.us/v2/users/me');
      expect(result.ok).toBe(true);
      expect(result.message).toBe('Successfully connected to Zoom as: Matt Nowzari');
    });

    it('should fall back to email when name is missing', async () => {
      const mockResponse = {
        data: { email: 'user@example.com' },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!Zoom.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Zoom.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(true);
      expect(result.message).toBe('Successfully connected to Zoom as: user@example.com');
    });

    it('should fall back to Unknown when no identity fields are present', async () => {
      const mockResponse = { data: {} };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!Zoom.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Zoom.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(true);
      expect(result.message).toBe('Successfully connected to Zoom as: Unknown');
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!Zoom.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Zoom.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });

    it('should handle network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      if (!Zoom.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Zoom.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Network timeout');
    });

    it('should handle non-Error thrown values', async () => {
      mockClient.get.mockRejectedValue('unexpected string error');

      if (!Zoom.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Zoom.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Unknown error');
    });
  });
});
