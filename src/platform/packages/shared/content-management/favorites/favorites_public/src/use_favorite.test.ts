/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { useFavorite } from './use_favorite';
import { useAddFavorite, useFavorites, useRemoveFavorite } from './favorites_query';
import { useFavoritesClient } from './favorites_context';

jest.mock('./favorites_query');
jest.mock('./favorites_context');

const mockUseFavorites = useFavorites as jest.MockedFunction<typeof useFavorites>;
const mockUseAddFavorite = useAddFavorite as jest.MockedFunction<typeof useAddFavorite>;
const mockUseRemoveFavorite = useRemoveFavorite as jest.MockedFunction<typeof useRemoveFavorite>;
const mockUseFavoritesClient = useFavoritesClient as jest.MockedFunction<typeof useFavoritesClient>;

const addMutate = jest.fn();
const removeMutate = jest.fn();
const reportAddFavoriteClick = jest.fn();
const reportRemoveFavoriteClick = jest.fn();

const setMocks = ({
  data,
  isAdding = false,
  isRemoving = false,
}: {
  data?: { favoriteIds: string[] };
  isAdding?: boolean;
  isRemoving?: boolean;
}) => {
  mockUseFavorites.mockReturnValue({ data } as ReturnType<typeof useFavorites>);
  mockUseAddFavorite.mockReturnValue({
    isLoading: isAdding,
    mutate: addMutate,
  } as unknown as ReturnType<typeof useAddFavorite>);
  mockUseRemoveFavorite.mockReturnValue({
    isLoading: isRemoving,
    mutate: removeMutate,
  } as unknown as ReturnType<typeof useRemoveFavorite>);
  mockUseFavoritesClient.mockReturnValue({
    reportAddFavoriteClick,
    reportRemoveFavoriteClick,
  } as unknown as ReturnType<typeof useFavoritesClient>);
};

describe('useFavorite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when id is missing', () => {
    setMocks({ data: { favoriteIds: [] } });

    const { result } = renderHook(() => useFavorite({}));

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when favorites data has not loaded', () => {
    setMocks({ data: undefined });

    const { result } = renderHook(() => useFavorite({ id: 'dash-1' }));

    expect(result.current).toBeUndefined();
  });

  it('returns unfavorited when id is not in favoriteIds', () => {
    setMocks({ data: { favoriteIds: ['other'] } });

    const { result } = renderHook(() => useFavorite({ id: 'dash-1' }));

    expect(result.current?.status).toBe('unfavorited');
  });

  it('returns favorited when id is in favoriteIds', () => {
    setMocks({ data: { favoriteIds: ['dash-1'] } });

    const { result } = renderHook(() => useFavorite({ id: 'dash-1' }));

    expect(result.current?.status).toBe('favorited');
  });

  it('returns adding while add mutation is loading', () => {
    setMocks({ data: { favoriteIds: [] }, isAdding: true });

    const { result } = renderHook(() => useFavorite({ id: 'dash-1' }));

    expect(result.current?.status).toBe('adding');
  });

  it('returns removing while remove mutation is loading', () => {
    setMocks({ data: { favoriteIds: ['dash-1'] }, isRemoving: true });

    const { result } = renderHook(() => useFavorite({ id: 'dash-1' }));

    expect(result.current?.status).toBe('removing');
  });

  it('adds a favorite when toggling from unfavorited', () => {
    setMocks({ data: { favoriteIds: [] } });

    const { result } = renderHook(() => useFavorite({ id: 'dash-1' }));

    act(() => {
      result.current?.onToggle();
    });

    expect(reportAddFavoriteClick).toHaveBeenCalledTimes(1);
    expect(addMutate).toHaveBeenCalledWith({ id: 'dash-1' });
    expect(removeMutate).not.toHaveBeenCalled();
  });

  it('removes a favorite when toggling from favorited', () => {
    setMocks({ data: { favoriteIds: ['dash-1'] } });

    const { result } = renderHook(() => useFavorite({ id: 'dash-1' }));

    act(() => {
      result.current?.onToggle();
    });

    expect(reportRemoveFavoriteClick).toHaveBeenCalledTimes(1);
    expect(removeMutate).toHaveBeenCalledWith({ id: 'dash-1' });
    expect(addMutate).not.toHaveBeenCalled();
  });

  it('no-ops onToggle while a mutation is in flight', () => {
    setMocks({ data: { favoriteIds: [] }, isAdding: true });

    const { result } = renderHook(() => useFavorite({ id: 'dash-1' }));

    act(() => {
      result.current?.onToggle();
    });

    expect(addMutate).not.toHaveBeenCalled();
    expect(removeMutate).not.toHaveBeenCalled();
    expect(reportAddFavoriteClick).not.toHaveBeenCalled();
    expect(reportRemoveFavoriteClick).not.toHaveBeenCalled();
  });

  it('returns a stable object identity across re-renders', () => {
    setMocks({ data: { favoriteIds: ['dash-1'] } });

    const { result, rerender } = renderHook(() => useFavorite({ id: 'dash-1' }));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it('returns a new object when status changes', () => {
    setMocks({ data: { favoriteIds: [] } });

    const { result, rerender } = renderHook(() => useFavorite({ id: 'dash-1' }));
    const first = result.current;

    setMocks({ data: { favoriteIds: [] }, isAdding: true });
    rerender();

    expect(result.current).not.toBe(first);
    expect(result.current?.status).toBe('adding');
  });
});
