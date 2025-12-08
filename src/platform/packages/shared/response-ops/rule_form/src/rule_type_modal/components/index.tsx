/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { countBy } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { RuleTypeModel } from '@kbn/alerts-ui-shared';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import type { FindRuleTemplatesRequestQueryV1, FindRuleTemplatesResponseV1 } from '@kbn/alerting-plugin/common/routes/rule_template/apis/find';
import { RuleTypeModal, type RuleTypeModalProps } from './rule_type_modal';
import { filterAndCountRuleTypes } from './helpers/filter_and_count_rule_types';

export interface RuleTypeModalComponentProps {
  http: HttpStart;
  toasts: ToastsStart;
  filteredRuleTypes: string[];
  registeredRuleTypes: RuleTypeModel[];
  onClose: RuleTypeModalProps['onClose'];
  onSelectRuleType: RuleTypeModalProps['onSelectRuleType'];
  onSelectTemplate: RuleTypeModalProps['onSelectTemplate'];
}

const EMPTY_ARRAY: string[] = [];

export const RuleTypeModalComponent: React.FC<RuleTypeModalComponentProps> = ({
  http,
  toasts,
  filteredRuleTypes = EMPTY_ARRAY,
  registeredRuleTypes,
  ...rest
}) => {
  const [selectedProducer, setSelectedProducer] = useState<string | null>(null);
  const [searchString, setSearchString] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<'ruleType' | 'template'>('ruleType');
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalTemplates, setTotalTemplates] = useState<number>(0);
  const [rawTemplates, setRawTemplates] = useState<
    Array<{
      id: string;
      name: string;
      tags: string[];
      ruleTypeId: string;
    }>
  >([]);

  const registeredRuleTypesWithAppContext = registeredRuleTypes.filter(
    ({ requiresAppContext }) => !requiresAppContext
  );
  const {
    ruleTypesState: { data: ruleTypeIndex, isLoading: ruleTypesLoading },
  } = useGetRuleTypesPermissions({
    http,
    toasts,
    filteredRuleTypes,
    registeredRuleTypes: registeredRuleTypesWithAppContext,
  });

  // Count producers before filtering. This is used to determine if we should show the categories,
  // and categories should only be hidden if there is only one producer BEFORE filters are applied,
  // e.g. on oblt serverless
  const hasOnlyOneProducer = useMemo(() => {
    const producerCount = countBy([...ruleTypeIndex.values()], 'producer');
    return Object.keys(producerCount).length === 1;
  }, [ruleTypeIndex]);

  const [ruleTypes, ruleTypeCountsByProducer] = useMemo(
    () => filterAndCountRuleTypes(ruleTypeIndex, selectedProducer, searchString),
    [ruleTypeIndex, searchString, selectedProducer]
  );

  // Debounce search string for template API calls to avoid excessive requests
  const [debouncedSearchString, setDebouncedSearchString] = useState(searchString);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchString(searchString);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchString]);

  // Fetch templates when in Template mode
  useEffect(() => {
    let ignore = false;
    if (selectedMode !== 'template') {
      return;
    }

    // we offload the searching to the API here which is a little different to how we fetch rule types. 
    // this is appropriate since the number of templates may be large, and the API offers paginated search.
    const fetchTemplates = async () => {
      // Only show full loading state on initial load (page 1), otherwise just loading indicator on button
      if (currentPage === 1) {
        setTemplatesLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const queryParams: FindRuleTemplatesRequestQueryV1 = {
          per_page: 10,
          page: currentPage,
          sort_field: 'name',
          sort_order: 'asc',
          search: debouncedSearchString ? debouncedSearchString : undefined,
        };

        const res = await http.get<FindRuleTemplatesResponseV1>(
          '/internal/alerting/rule_template/_find',
          {
            query: queryParams,
          }
        );
        if (ignore) return;
        const items = res.data.map((template) => ({
          id: template.id,
          name: template.name,
          tags: template.tags,
          ruleTypeId: template.rule_type_id,
        }));
        setTotalTemplates(res.total);
        // Append to existing templates for pagination, or replace if page 1
        setRawTemplates((prev) => (currentPage === 1 ? items : [...prev, ...items]));
      } catch (e) {
        if (!ignore) {
          toasts.addDanger({
            title: 'Error loading templates',
            text: e?.message ?? String(e),
          });
        }
      } finally {
        if (!ignore) {
          setTemplatesLoading(false);
          setLoadingMore(false);
        }
      }
    };
    fetchTemplates();
    return () => {
      ignore = true;
    };
  }, [http, toasts, selectedMode, debouncedSearchString, currentPage]);

  // Enrich templates with rule type metadata
  const templates = useMemo(
    () => {
      return rawTemplates.map((t) => {
        const rt = ruleTypeIndex.get(t.ruleTypeId);
        return {
          ...t,
          ruleTypeName: rt?.name,
          producer: rt?.producer,
        };
      });
    },
    [rawTemplates, ruleTypeIndex]
  );

  const hasMoreTemplates = rawTemplates.length < totalTemplates;

  const handleLoadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  return (
    <RuleTypeModal
      {...rest}
      ruleTypes={ruleTypes}
      ruleTypeCountsByProducer={ruleTypeCountsByProducer}
      ruleTypesLoading={ruleTypesLoading}
      onChangeSearch={setSearchString}
      onFilterByProducer={setSelectedProducer}
      selectedProducer={selectedProducer}
      searchString={searchString}
      showCategories={!hasOnlyOneProducer}
      selectedMode={selectedMode}
      onChangeMode={setSelectedMode}
      templates={templates}
      templatesLoading={templatesLoading}
      loadingMore={loadingMore}
      hasMoreTemplates={hasMoreTemplates}
      onLoadMoreTemplates={handleLoadMore}
    />
  );
};
