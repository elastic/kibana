/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ComponentProps } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { isEqual } from 'lodash';
import { EuiFlexItem } from '@elastic/eui';
import type { DataViewSpec, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { HttpStart } from '@kbn/core-http-browser';
import { NotificationsStart } from '@kbn/core-notifications-browser';
import { useAlertDataView } from '../..';
import { FilterGroupLoading } from './loading';
import { DEFAULT_CONTROLS } from './constants';
import { FilterGroup } from './filter_group';
import { FilterItemObj } from './types';

type AlertsFiltersProps = Omit<
  ComponentProps<typeof FilterGroup>,
  'dataViewId' | 'defaultControls' | 'featureIds'
> & {
  featureIds?: AlertConsumers[];
  defaultControls?: FilterItemObj[];
  dataViewSpec?: DataViewSpec;
  controlsFromUrl?: FilterItemObj[];
  dependencies: {
    http: HttpStart;
    notifications: NotificationsStart;
    dataViews: DataViewsPublicPluginStart;
  };
};

const AlertsFilters = (props: AlertsFiltersProps) => {
  const {
    featureIds = [AlertConsumers.STACK_ALERTS],
    dataViewSpec,
    dependencies: {
      http,
      notifications: { toasts },
      dataViews,
    },
    onFilterChange,
    defaultControls = DEFAULT_CONTROLS,
    ...restFilterItemGroupProps
  } = props;
  const [loadingPageFilters, setLoadingPageFilters] = useState(true);
  const { dataViews: alertDataViews, loading: loadingDataViews } = useAlertDataView({
    featureIds: featureIds?.length ? featureIds : [AlertConsumers.STACK_ALERTS],
    dataViewsService: dataViews,
    http,
    toasts,
  });

  useEffect(() => {
    if (!loadingDataViews) {
      if (!alertDataViews?.[0]?.id) {
        (async () => {
          // Creates an adhoc dataview if it does not already exist just for alert index
          const spec = {
            ...(alertDataViews?.[0] ?? {}),
            ...(dataViewSpec ?? {}),
          } as DataViewSpec;
          await dataViews.create(spec);
          setLoadingPageFilters(false);
        })();
      } else {
        setLoadingPageFilters(false);
      }
    }

    return () => dataViews.clearInstanceCache();
  }, [dataViewSpec, alertDataViews, dataViews, loadingDataViews]);

  const filterChangesHandler = useCallback(
    (newFilters: Filter[]) => {
      if (!onFilterChange) {
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

      onFilterChange(updatedFilters);
    },
    [onFilterChange]
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
      dataViewId={alertDataViews?.[0].id || dataViewSpec?.id || null}
      onFilterChange={filterChangesHandler}
      featureIds={featureIds}
      {...restFilterItemGroupProps}
      defaultControls={defaultControls}
    />
  );
};

const arePropsEqual = (prevProps: AlertsFiltersProps, newProps: AlertsFiltersProps) => {
  return isEqual(prevProps, newProps);
};

export const AlertsFilterControls = React.memo(AlertsFilters, arePropsEqual);
