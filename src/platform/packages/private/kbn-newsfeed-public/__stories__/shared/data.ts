/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { FetchResult, NewsfeedItem } from '../../src/types';

export const createMockNewsItem = (
  id: number,
  title: string,
  description: string,
  heroImageUrl: string | null = null,
  options?: {
    badge?: string;
    category?: 'observability' | 'security' | 'search';
  }
): NewsfeedItem => ({
  title,
  description,
  heroImageUrl,
  linkText: 'Read more',
  linkUrl: 'https://www.elastic.co/blog',
  badge: options?.badge || null,
  category: options?.category,
  hash: `news-item-${id}`,
  publishOn: moment().subtract(id, 'days'),
  expireOn: moment().add(30, 'days'),
});

// API returns all categories mixed together
export const mockNewsItems: NewsfeedItem[] = [
  // General news (no category)
  createMockNewsItem(
    1,
    'Elastic 8.x Released',
    'Discover the latest features and improvements in Elastic 8.x, including enhanced security and performance.',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
    { badge: 'Release' }
  ),
  createMockNewsItem(
    2,
    'New Machine Learning Capabilities',
    'Explore the new machine learning features that help you detect anomalies faster and more accurately.',
    'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800&h=400&fit=crop'
  ),
  createMockNewsItem(
    3,
    'Kibana Dashboard Updates',
    'Check out the improved dashboard experience with better visualization options and faster load times.',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
    { badge: 'Update' }
  ),
  // Observability news
  createMockNewsItem(
    10,
    'Advanced APM Features',
    'Monitor application performance with enhanced distributed tracing and service maps.',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
    { badge: 'New', category: 'observability' }
  ),
  createMockNewsItem(
    11,
    'Infrastructure Monitoring Updates',
    'Get real-time insights into your infrastructure health with improved metric visualization.',
    'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=400&fit=crop',
    { category: 'observability' }
  ),
  createMockNewsItem(
    12,
    'Log Analysis Improvements',
    'Faster log queries and better anomaly detection for your observability workflows.',
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop',
    { badge: 'Update', category: 'observability' }
  ),
  // Security news
  createMockNewsItem(
    20,
    'Enhanced Threat Detection',
    'New ML-powered threat detection capabilities to identify security risks faster.',
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=400&fit=crop',
    { badge: 'New', category: 'security' }
  ),
  createMockNewsItem(
    21,
    'Security Analytics Dashboard',
    'Visualize security events and incidents with the new analytics dashboard.',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=400&fit=crop',
    { category: 'security' }
  ),
  createMockNewsItem(
    22,
    'Endpoint Security Updates',
    'Improved endpoint protection and response capabilities for your security team.',
    'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&h=400&fit=crop',
    { badge: 'Update', category: 'security' }
  ),
  // Search news
  createMockNewsItem(
    30,
    'Vector Search Capabilities',
    'Build powerful semantic search applications with native vector search support.',
    'https://images.unsplash.com/photo-1527576539890-dfa815648363?w=800&h=400&fit=crop',
    { badge: 'New', category: 'search' }
  ),
  createMockNewsItem(
    31,
    'Search Relevance Tools',
    'Fine-tune your search results with improved relevance tuning and analytics.',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop',
    { category: 'search' }
  ),
  createMockNewsItem(
    32,
    'Enterprise Search Updates',
    'Enhanced connectors and faster indexing for your enterprise search needs.',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=400&fit=crop',
    { badge: 'Update', category: 'search' }
  ),
];

export const mockFetchResult: FetchResult = {
  feedItems: mockNewsItems,
  hasNew: true,
  kibanaVersion: '9.4.0',
  error: null,
};
