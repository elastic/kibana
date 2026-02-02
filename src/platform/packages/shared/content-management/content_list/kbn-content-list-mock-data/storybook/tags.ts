/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface MockTag {
  id: string;
  name: string;
  description: string;
  color: string;
  managed: boolean;
}

/**
 * Mock tags for testing tag filtering
 */
export const MOCK_TAGS: MockTag[] = [
  {
    id: 'tag-important',
    name: 'Important',
    description: 'High-priority items',
    color: '#FF6B6B',
    managed: false,
  },
  {
    id: 'tag-production',
    name: 'Production',
    description: 'Production dashboards',
    color: '#4ECDC4',
    managed: false,
  },
  {
    id: 'tag-development',
    name: 'Development',
    description: 'Development and testing',
    color: '#45B7D1',
    managed: false,
  },
  {
    id: 'tag-archived',
    name: 'Archived',
    description: 'Archived items',
    color: '#95A5A6',
    managed: false,
  },
  {
    id: 'tag-security',
    name: 'Security',
    description: 'Security-related dashboards',
    color: '#9B59B6',
    managed: false,
  },
  {
    id: 'fleet-pkg-endpoint-default',
    managed: true,
    name: 'Elastic Defend',
    description: '',
    color: '#4DD2CA',
  },
  {
    id: 'fleet-managed-default',
    managed: true,
    name: 'Managed',
    description: '',
    color: '#0077CC',
  },
  {
    id: 'endpoint-security-solution-default',
    managed: true,
    color: '#D36086',
    description: '',
    name: 'Security Solution',
  },
];

/**
 * Tag mock data wrapped in search response format
 */
export const TAG_MOCK_SEARCH_RESPONSE = {
  tags: MOCK_TAGS.filter((tag) => tag.managed || ['Test'].includes(tag.name)).concat([
    {
      id: '7f785d25-9d65-41d1-aeb9-51a59532b239',
      managed: false,
      name: 'Test',
      description: '',
      color: '#8bd09c',
    },
  ]),
};
