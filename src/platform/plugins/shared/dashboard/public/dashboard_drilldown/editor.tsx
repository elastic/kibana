/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox, EuiSkeletonText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { DrilldownEditorProps } from '@kbn/embeddable-plugin/public';
import useDebounce from 'react-use/lib/useDebounce';
import type { DashboardDrilldownState } from '../../server';
import { findService } from '../dashboard_client';
import { DEFAULT_DASHBOARD_NAVIGATION_OPTIONS } from '../../common/page_bundle_constants';
import { DashboardNavigationOptionsEditor } from '../dashboard_navigation/options_editor';

export const DashboardDrilldownEditor = (props: DrilldownEditorProps<DashboardDrilldownState>) => {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [initialDashboardOption, setInitialDashboardOption] = useState<
    EuiComboBoxOptionOption<string> | undefined
  >();
  const [isLoadingInitialDashboard, setIsLoadingInitialDashboard] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [searchString, setSearchString] = useState<string | undefined>();
  const [debouncedSearchString, setDebouncedSearchString] = useState<string | undefined>();

  useDebounce(
    () => {
      setDebouncedSearchString(searchString);
    },
    500,
    [searchString]
  );

  useEffect(() => {
    let canceled = false;
    setIsLoadingOptions(true);

    findService
      .search({
        search: debouncedSearchString ?? '',
        per_page: 100,
      })
      .then((results) => {
        if (canceled) {
          return;
        }

        setOptions(
          results.dashboards.map(({ id, data }) => ({
            value: id,
            label: data.title,
          }))
        );
        setIsLoadingOptions(false);
      });

    return () => {
      canceled = true;
    };
  }, [debouncedSearchString]);

  useEffect(() => {
    const initialDashboardId = props.state.dashboard_id;
    if (!initialDashboardId) {
      return;
    }

    let canceled = false;
    setIsLoadingInitialDashboard(true);
    findService.findById(initialDashboardId).then((result) => {
      if (canceled) {
        return;
      }
      setIsLoadingInitialDashboard(false);
      // handle case when destination dashboard no longer exists
      if (result.status === 'error') {
        setError(
          result.notFound
            ? i18n.translate('dashboard.drilldown.errorDestinationDashboardIsMissing', {
                defaultMessage:
                  "Destination dashboard (''{dashboardId}'') no longer exists. Choose another dashboard.",
                values: {
                  dashboardId: initialDashboardId,
                },
              })
            : result.error.message
        );
        props.onChange({ ...props.state, dashboard_id: undefined });
        return;
      }

      setInitialDashboardOption({
        value: initialDashboardId,
        label: result.attributes.title,
      });
    });

    return () => {
      canceled = true;
    };

    // run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mergedOptions = useMemo(() => {
    if (!initialDashboardOption || initialDashboardOption.value !== props.state.dashboard_id) {
      return options;
    }

    const hasInitialDashboard = options.some(({ value }) => value === initialDashboardOption.value);
    return hasInitialDashboard ? options : [initialDashboardOption, ...options];
  }, [initialDashboardOption, options, props.state]);

  const selectedOptions = useMemo(() => {
    if (!props.state.dashboard_id) {
      return undefined;
    }
    const selectedOption = mergedOptions.find(({ value }) => value === props.state.dashboard_id);
    return selectedOption ? [selectedOption] : undefined;
  }, [mergedOptions, props.state.dashboard_id]);

  const navigationOptions = useMemo(() => {
    return {
      ...DEFAULT_DASHBOARD_NAVIGATION_OPTIONS,
      ...props.state,
    };
  }, [props.state]);

  return (
    <EuiSkeletonText isLoading={isLoadingInitialDashboard}>
      <EuiFormRow
        label={i18n.translate(
          'dashboard.components.DashboardDrilldownConfig.chooseDestinationDashboard',
          {
            defaultMessage: 'Choose destination dashboard',
          }
        )}
        fullWidth
        isInvalid={!!error}
        error={error}
      >
        <EuiComboBox<string>
          async
          selectedOptions={selectedOptions}
          options={mergedOptions}
          onChange={(nextSelectedOptions) => {
            props.onChange({ ...props.state, dashboard_id: nextSelectedOptions?.[0]?.value });
            if (error) {
              setError(undefined);
            }
          }}
          onSearchChange={setSearchString}
          isLoading={isLoadingOptions}
          singleSelection={{ asPlainText: true }}
          fullWidth
          data-test-subj={'dashboardDrilldownSelectDashboard'}
          isInvalid={!!error}
        />
      </EuiFormRow>
      <DashboardNavigationOptionsEditor
        options={navigationOptions}
        onOptionChange={(changedState) => {
          props.onChange({
            ...props.state,
            ...changedState,
          });
        }}
      />
    </EuiSkeletonText>
  );
};
