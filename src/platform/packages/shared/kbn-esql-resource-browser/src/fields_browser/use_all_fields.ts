/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type {
  ESQLFieldWithMetadata,
  RecommendedField,
  ESQLRegistrySolutionId,
} from '@kbn/esql-types';
import type { TimeRange } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import { getEditorExtensions, getEsqlColumns } from '@kbn/esql-utils';

export interface UseAllFieldsParams {
  isOpen: boolean;
  preloadedFields: Array<{ name: string; type?: string }>;
  indexPattern: string;
  fullQuery: string;
  http?: HttpStart;
  activeSolutionId?: ESQLRegistrySolutionId;
  search?: ISearchGeneric;
  getTimeRange?: () => TimeRange;
  signal?: AbortSignal;
}

export const useAllFields = ({
  isOpen,
  preloadedFields,
  indexPattern,
  fullQuery,
  http,
  activeSolutionId,
  search,
  getTimeRange,
  signal,
}: UseAllFieldsParams): {
  allFields: ESQLFieldWithMetadata[];
  recommendedFields: RecommendedField[];
  isLoading: boolean;
} => {
  const [allFields, setAllFields] = useState<ESQLFieldWithMetadata[]>([]);
  const [recommendedFields, setRecommendedFields] = useState<RecommendedField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let isEffectActive = true;
    const canFetchRecommendations = Boolean(http && activeSolutionId && fullQuery);
    if (canFetchRecommendations) {
      getEditorExtensions(http!, fullQuery, activeSolutionId!)
        .then((extensions) => {
          if (isMountedRef.current && isEffectActive) {
            setRecommendedFields(extensions?.recommendedFields ?? []);
          }
        })
        .catch(() => {
          if (isMountedRef.current && isEffectActive) {
            setRecommendedFields([]);
          }
        });
    }

    return () => {
      isEffectActive = false;
    };
  }, [activeSolutionId, http, isOpen, fullQuery]);

  useEffect(() => {
    if (!isOpen) return;

    if (preloadedFields.length) {
      const fieldsFromNames: ESQLFieldWithMetadata[] = preloadedFields.map((f) => ({
        name: f.name,
        type: (f.type as ESQLFieldWithMetadata['type']) ?? 'keyword',
        userDefined: false,
      }));
      setAllFields(fieldsFromNames);
      return;
    }

    const canFetch = Boolean(indexPattern && search && getTimeRange);
    if (!canFetch) {
      return;
    }

    const fetchFields = async () => {
      setIsLoading(true);
      try {
        const fetched = await getEsqlColumns({
          esqlQuery: `FROM ${indexPattern}`.trim(),
          search: search!,
          timeRange: getTimeRange!(),
          signal,
        });
        if (isMountedRef.current) setAllFields(fetched);
      } catch {
        if (isMountedRef.current) setAllFields([]);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    fetchFields();
  }, [getTimeRange, isOpen, preloadedFields, indexPattern, search, signal]);

  return { allFields, recommendedFields, isLoading };
};
