/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTourStep,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import useMount from 'react-use/lib/useMount';
import { pluginServices } from '../../services/plugin_services';
import { filterTourStrings } from '../_dashboard_app_strings';

const FILTER_TOUR_OPT_OUT_LOCAL_KEY = 'dashboardHideFilterTour';

export const IgnoreFilterTour = ({ dataViews = [] }: { dataViews: DataView[] }) => {
  const [isTourOpen, setTourOpen] = useState(false);
  const [hideTour, setHideTour] = useState(false);
  const tourOptOut = localStorage.getItem(FILTER_TOUR_OPT_OUT_LOCAL_KEY) === 'true';

  const {
    application: { navigateToApp },
  } = pluginServices.getServices();

  useMount(() => {
    if (!tourOptOut) {
      setTourOpen(true);
    }
  });

  return (
    <EuiTourStep
      data-test-subj="ignore_filter_tour"
      anchor='[data-test-subj="addFilter"]'
      title={
        <>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="warning" color="warning" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{filterTourStrings.title}</EuiFlexItem>
          </EuiFlexGroup>
        </>
      }
      isOpen={dataViews.length > 1 && isTourOpen}
      step={1}
      stepsTotal={1}
      content={
        <EuiText size="s">
          <p>{filterTourStrings.description}</p>
          <EuiLink
            onClick={() =>
              navigateToApp('management', {
                path: '/kibana/settings?query=ignoreFilterIfFieldNotInIndex',
              })
            }
          >
            {filterTourStrings.advancedSettingsLink}
          </EuiLink>
        </EuiText>
      }
      onFinish={() => {
        setTourOpen(false);
      }}
      maxWidth={350}
      anchorPosition="upLeft"
      offset={0}
      decoration="beacon"
      footerAction={
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="baseline">
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              compressed
              id="dashboard.topNav.hideFilterTour"
              checked={hideTour}
              onChange={() => {
                setHideTour(!hideTour);
              }}
              label={<EuiText size="xs">{filterTourStrings.tourOptOut}</EuiText>}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={() => {
                setTourOpen(false);
                if (hideTour) {
                  localStorage.setItem('FILTER_TOUR_OPT_OUT_LOCAL_KEY', 'true');
                }
              }}
              data-test-subj="ignore_filter_tour_dismiss_button"
            >
              {filterTourStrings.closeButton}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};
