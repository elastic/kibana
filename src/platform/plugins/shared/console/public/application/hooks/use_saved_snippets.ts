/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import type { SavedSnippet } from '../../services';
import { useServicesContext } from '../contexts';

/**
 * Hook to fetch saved snippets with optional search filtering
 * @param searchTerm - Optional search term to filter snippets
 * @param perPage - Number of items per page (default: 20)
 * @param page - Page number (default: 1)
 */
export const useSavedSnippets = (searchTerm?: string, perPage?: number, page?: number) => {
  const {
    services: { savedSnippetsService },
  } = useServicesContext();

  return useQuery({
    queryKey: ['console', 'snippets', searchTerm, perPage, page],
    queryFn: () => savedSnippetsService.find(searchTerm, perPage, page),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single saved snippet by ID
 * @param id - The snippet ID to fetch
 */
export const useSavedSnippet = (id: string) => {
  const {
    services: { savedSnippetsService },
  } = useServicesContext();

  return useQuery({
    queryKey: ['console', 'snippet', id],
    queryFn: () => savedSnippetsService.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to create a new saved snippet
 */
export const useSaveSnippet = () => {
  const {
    services: { savedSnippetsService },
  } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snippet: SavedSnippet) => savedSnippetsService.create(snippet),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console', 'snippets'] });
    },
  });
};

/**
 * Hook to update an existing saved snippet
 */
export const useUpdateSnippet = () => {
  const {
    services: { savedSnippetsService },
  } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, snippet }: { id: string; snippet: SavedSnippet }) =>
      savedSnippetsService.update(id, snippet),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['console', 'snippets'] });
      queryClient.invalidateQueries({ queryKey: ['console', 'snippet', variables.id] });
    },
  });
};

/**
 * Hook to delete a saved snippet
 */
export const useDeleteSnippet = () => {
  const {
    services: { savedSnippetsService },
  } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => savedSnippetsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console', 'snippets'] });
    },
  });
};
