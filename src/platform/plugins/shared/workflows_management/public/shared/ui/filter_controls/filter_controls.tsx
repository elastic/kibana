/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexItem } from '@elastic/eui';
import type { ComponentProps } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import type { DataViewSpec, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { FilterGroup } from './filter_group';
import { FilterGroupLoading } from './loading';
import type { FilterControlConfig } from './types';

export type FilterControlsProps = Omit<
  ComponentProps<typeof FilterGroup>,
  'dataViewId' | 'defaultControls' | 'Storage'
> & {
  /**
   * An array of default control configurations
   */
  defaultControls?: FilterControlConfig[];
  /**
   * The spec for the (ad-hoc) data view the filter controls operate on.
   * The data view is created on mount so the option list controls can resolve fields.
   */
  dataViewSpec: DataViewSpec;
  /**
   * The services needed by the filter bar
   */
  services: {
    dataViews: DataViewsPublicPluginStart;
    storage: typeof Storage;
  };
  /**
   * Disable data view cache management
   */
  preventCacheClearOnUnmount?: boolean;
};

/**
 * A configurable, domain-agnostic filters bar based on the controls embeddable.
 *
 * This is a decoupled variant of `AlertFilterControls` from `@kbn/alerts-ui-shared`: it does not
 * depend on the alerting framework (no `useAlertsDataView`/`ruleTypeIds`). The caller provides the
 * full ad-hoc data view spec and default controls instead.
 *
 * @example
 *
 * <FilterControls
 *   dataViewSpec={{ id: 'my-adhoc-dv', title: 'my-index-*', timeFieldName: '@timestamp' }}
 *   spaceId={spaceId}
 *   controlsUrlState={filterControls}
 *   defaultControls={DEFAULT_CONTROLS}
 *   filters={filters}
 *   onFiltersChange={setFilters}
 *   services={{ dataViews, storage: Storage }}
 * />
 */
export const FilterControls = (props: FilterControlsProps) => {
  const {
    defaultControls = [],
    dataViewSpec,
    onFiltersChange,
    services: { dataViews, storage },
    preventCacheClearOnUnmount,
    ...restFilterItemGroupProps
  } = props;
  const [loadingPageFilters, setLoadingPageFilters] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (dataViewSpec?.id) {
      (async () => {
        await dataViews.create(dataViewSpec);
        if (!cancelled) {
          setLoadingPageFilters(false);
        }
      })();
    } else {
      setLoadingPageFilters(false);
    }

    return () => {
      cancelled = true;
      if (preventCacheClearOnUnmount) {
        return;
      }
      dataViews.clearInstanceCache();
    };
  }, [dataViews, dataViewSpec, preventCacheClearOnUnmount]);

  const handleFilterChanges = useCallback(
    (newFilters: Filter[]) => {
      if (!onFiltersChange) {
        return;
      }
      const updatedFilters = newFilters.map((filter) => {
        return {
          ...filter,
          meta: {
            ...filter.meta,
            disabled: false,
          },
        };
      });

      onFiltersChange(updatedFilters);
    },
    [onFiltersChange]
  );

  if (loadingPageFilters) {
    return (
      <EuiFlexItem grow={true}>
        <FilterGroupLoading />
      </EuiFlexItem>
    );
  }

  return (
    <FilterGroup
      dataViewId={dataViewSpec?.id || null}
      onFiltersChange={handleFilterChanges}
      {...restFilterItemGroupProps}
      Storage={storage}
      defaultControls={defaultControls}
    />
  );
};
