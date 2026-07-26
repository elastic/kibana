/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { ZendeskConnector } from './zendesk';

describe('ZendeskConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { subdomain: 'test-company' },
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search action', () => {
    it('should call Zendesk search API', async () => {
      const mockResponse = { data: { results: [], count: 0 } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ZendeskConnector.actions.search.handler(mockContext, {
        query: 'status:open',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-company.zendesk.com/api/v2/search',
        expect.objectContaining({
          params: { query: 'status:open' },
        })
      );
    });
  });

  describe('listTickets action', () => {
    it('should call Zendesk tickets list API', async () => {
      const mockResponse = { data: { tickets: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ZendeskConnector.actions.listTickets.handler(mockContext, {
        page: 1,
        perPage: 25,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-company.zendesk.com/api/v2/tickets.json',
        expect.objectContaining({
          params: { page: 1, per_page: 25 },
        })
      );
    });
  });

  describe('getTicket action', () => {
    it('should call Zendesk get ticket API', async () => {
      const mockResponse = { data: { ticket: { id: 123 } } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ZendeskConnector.actions.getTicket.handler(mockContext, {
        ticketId: '123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-company.zendesk.com/api/v2/tickets/123.json',
        expect.objectContaining({
          params: { include: 'comment_count' },
        })
      );
    });
  });

  describe('whoAmI action', () => {
    it('should call Zendesk users/me.json API', async () => {
      const mockResponse = { data: { user: { id: 1, email: 'agent@test.com' } } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ZendeskConnector.actions.whoAmI.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-company.zendesk.com/api/v2/users/me.json'
      );
    });
  });

  describe('getTicketComments action', () => {
    it('should call Zendesk get ticket comments API', async () => {
      const mockResponse = { data: { comments: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ZendeskConnector.actions.getTicketComments.handler(mockContext, {
        ticketId: '456',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-company.zendesk.com/api/v2/tickets/456/comments.json',
        expect.objectContaining({
          params: {},
        })
      );
    });

    it('should pass optional params to the API', async () => {
      const mockResponse = { data: { comments: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ZendeskConnector.actions.getTicketComments.handler(mockContext, {
        ticketId: '789',
        page: 2,
        perPage: 10,
        include: 'users',
        includeInlineImages: true,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-company.zendesk.com/api/v2/tickets/789/comments.json',
        expect.objectContaining({
          params: {
            page: 2,
            per_page: 10,
            include: 'users',
            include_inline_images: true,
          },
        })
      );
    });
  });
});
