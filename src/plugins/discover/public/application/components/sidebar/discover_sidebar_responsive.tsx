/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { sortBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { UiCounterMetricType } from '@kbn/analytics';
import { IUiSettingsClient } from 'kibana/public';
import {
  EuiTitle,
  EuiHideFor,
  EuiShowFor,
  EuiButton,
  EuiBadge,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiSpacer,
  EuiIcon,
  EuiLink,
  EuiPortal,
} from '@elastic/eui';
import { DiscoverIndexPattern } from './discover_index_pattern';
import { IndexPatternAttributes, IndexPatternsContract } from '../../../../../data/common';
import { SavedObject } from '../../../../../../core/types';
import { IndexPatternField, IndexPattern } from '../../../../../data/public';
import { getDefaultFieldFilter } from './lib/field_filter';
import { DiscoverSidebar } from './discover_sidebar';
import { DiscoverServices } from '../../../build_services';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';
import { AppState } from '../../angular/discover_state';

export interface DiscoverSidebarResponsiveProps {
  /**
   * Determines whether add/remove buttons are displayed non only when focused
   */
  alwaysShowActionButtons?: boolean;
  /**
   * the selected columns displayed in the doc table in discover
   */
  columns: string[];
  /**
   * Client of uiSettings
   */
  config: IUiSettingsClient;
  /**
   * a statistics of the distribution of fields in the given hits
   */
  fieldCounts: Record<string, number>;
  /**
   * hits fetched from ES, displayed in the doc table
   */
  hits: ElasticSearchHit[];
  /**
   * List of available index patterns
   */
  indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
  /**
   * Index patterns service
   */
  indexPatterns: IndexPatternsContract;
  /**
   * Has been toggled closed
   */
  isClosed?: boolean;
  /**
   * Callback function when selecting a field
   */
  onAddField: (fieldName: string) => void;
  /**
   * Callback function when adding a filter from sidebar
   */
  onAddFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  /**
   * Callback function when removing a field
   * @param fieldName
   */
  onRemoveField: (fieldName: string) => void;
  /**
   * Currently selected index pattern
   */
  selectedIndexPattern?: IndexPattern;
  /**
   * Discover plugin services;
   */
  services: DiscoverServices;
  /**
   * Function to set the current state
   */
  setAppState: (state: Partial<AppState>) => void;
  /**
   * Discover App state
   */
  state: AppState;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  /**
   * Shows index pattern and a button that displays the sidebar in a flyout
   */
  useFlyout?: boolean;
  /**
   * Read from the Fields API
   */
  useNewFieldsApi?: boolean;

  /**
   * an object containing properties for proper handling of unmapped fields in the UI
   */
  unmappedFieldsConfig?: {
    /**
     * callback function to change the value of `showUnmappedFields` flag
     * @param value new value to set
     */
    onChangeUnmappedFields: (value: boolean) => void;
    /**
     * determines whether to display unmapped fields
     * configurable through the switch in the UI
     */
    showUnmappedFields: boolean;
    /**
     * determines if we should display an option to toggle showUnmappedFields value in the first place
     * this value is not configurable through the UI
     */
    showUnmappedFieldsDefaultValue: boolean;
  };
}

/**
 * Component providing 2 different renderings for the sidebar depending on available screen space
 * Desktop: Sidebar view, all elements are visible
 * Mobile: Index pattern selector is visible and a button to trigger a flyout with all elements
 */
export function DiscoverSidebarResponsive(props: DiscoverSidebarResponsiveProps) {
  const [fieldFilter, setFieldFilter] = useState(getDefaultFieldFilter());
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  if (!props.selectedIndexPattern) {
    return null;
  }

  return (
    <>
      {props.isClosed ? null : (
        <EuiHideFor sizes={['xs', 's']}>
          <DiscoverSidebar {...props} fieldFilter={fieldFilter} setFieldFilter={setFieldFilter} />
        </EuiHideFor>
      )}
      <EuiShowFor sizes={['xs', 's']}>
        <div className="dscSidebar__mobile">
          <section
            aria-label={i18n.translate(
              'discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel',
              {
                defaultMessage: 'Index and fields',
              }
            )}
          >
            <DiscoverIndexPattern
              config={props.config}
              selectedIndexPattern={props.selectedIndexPattern}
              indexPatternList={sortBy(props.indexPatternList, (o) => o.attributes.title)}
              indexPatterns={props.indexPatterns}
              state={props.state}
              setAppState={props.setAppState}
              useNewFieldsApi={props.useNewFieldsApi}
            />
          </section>
          <EuiSpacer size="s" />
          <EuiButton
            contentProps={{ className: 'dscSidebar__mobileButton' }}
            fullWidth
            onClick={() => setIsFlyoutVisible(true)}
          >
            <FormattedMessage
              id="discover.fieldChooser.fieldsMobileButtonLabel"
              defaultMessage="Fields"
            />
            <EuiBadge
              className="dscSidebar__mobileBadge"
              color={props.columns[0] === '_source' ? 'default' : 'accent'}
            >
              {props.columns[0] === '_source' ? 0 : props.columns.length}
            </EuiBadge>
          </EuiButton>
        </div>
        {isFlyoutVisible && (
          <EuiPortal>
            <EuiFlyout
              size="s"
              onClose={() => setIsFlyoutVisible(false)}
              aria-labelledby="flyoutTitle"
              ownFocus
            >
              <EuiFlyoutHeader hasBorder>
                <EuiTitle size="s">
                  <h2 id="flyoutTitle">
                    <EuiLink color="text" onClick={() => setIsFlyoutVisible(false)}>
                      <EuiIcon
                        className="eui-alignBaseline"
                        aria-label={i18n.translate('discover.fieldList.flyoutBackIcon', {
                          defaultMessage: 'Back',
                        })}
                        type="arrowLeft"
                      />{' '}
                      <strong>
                        {i18n.translate('discover.fieldList.flyoutHeading', {
                          defaultMessage: 'Field list',
                        })}
                      </strong>
                    </EuiLink>
                  </h2>
                </EuiTitle>
              </EuiFlyoutHeader>
              {/* Using only the direct flyout body class because we maintain scroll in a lower sidebar component. Needs a fix on the EUI side */}
              <div className="euiFlyoutBody">
                <DiscoverSidebar
                  {...props}
                  fieldFilter={fieldFilter}
                  setFieldFilter={setFieldFilter}
                  alwaysShowActionButtons={true}
                />
              </div>
            </EuiFlyout>
          </EuiPortal>
        )}
      </EuiShowFor>
    </>
  );
}
