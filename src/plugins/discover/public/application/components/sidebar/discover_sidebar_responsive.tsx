/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useState } from 'react';
import { sortBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { UiStatsMetricType } from '@kbn/analytics';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiHideFor,
  EuiShowFor,
  EuiButton,
  EuiBadge,
  EuiFlyoutHeader,
  EuiButtonIcon,
  EuiFlyoutBody,
  EuiFlyout,
} from '@elastic/eui';
import { DiscoverIndexPattern } from './discover_index_pattern';
import { IndexPatternAttributes } from '../../../../../data/common';
import { SavedObject } from '../../../../../../core/types';
import { IndexPatternField, IndexPattern } from '../../../../../data/public';
import { getDefaultFieldFilter } from './lib/field_filter';
import { DiscoverSidebar } from './discover_sidebar';
import { DiscoverServices } from '../../../build_services';

export interface DiscoverSidebarResponsiveProps {
  /**
   * the selected columns displayed in the doc table in discover
   */
  columns: string[];
  /**
   * a statistics of the distribution of fields in the given hits
   */
  fieldCounts: Record<string, number>;
  /**
   * hits fetched from ES, displayed in the doc table
   */
  hits: Array<Record<string, unknown>>;
  /**
   * List of available index patterns
   */
  indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
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
   * Callback function to select another index pattern
   */
  setIndexPattern: (id: string) => void;
  /**
   * Shows Add button at all times and not only on focus
   */
  mobile?: boolean;
  /**
   * Shows index pattern and a button that displays the sidebar in a flyout
   */
  useFlyout?: boolean;
  /**
   * Additional classname
   */
  sidebarClassName?: string;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiStatsMetricType, eventName: string | string[]) => void;
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
      <EuiHideFor sizes={['xs', 's']}>
        <div
          className={`dscSidebar dscSidebar__desktop dscCollapsibleSidebar ${props.sidebarClassName}`}
        >
          <DiscoverSidebar {...props} fieldFilter={fieldFilter} setFieldFilter={setFieldFilter} />
        </div>
      </EuiHideFor>
      <EuiShowFor sizes={['xs', 's']}>
        <div className="dscSidebar dscSidebar__mobile">
          <section
            className="sidebar-list dscSidebar__section "
            aria-label={i18n.translate(
              'discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel',
              {
                defaultMessage: 'Index and fields',
              }
            )}
          >
            <div className="dscSidebar__sectionStatic">
              <DiscoverIndexPattern
                selectedIndexPattern={props.selectedIndexPattern}
                setIndexPattern={props.setIndexPattern}
                indexPatternList={sortBy(props.indexPatternList, (o) => o.attributes.title)}
              />
            </div>
          </section>
          <EuiButton
            contentProps={{ className: 'dscSidebar__mobileButton' }}
            iconSide="right"
            iconType="arrowRight"
            fullWidth
            onClick={() => setIsFlyoutVisible(true)}
          >
            <FormattedMessage
              id="discover.fieldChooser.fieldsMobileButtonLabel"
              defaultMessage="Fields"
            />
            <EuiBadge className="dscSidebar__mobileBadge" color="accent">
              {props.columns[0] === '_source' ? 0 : props.columns.length}
            </EuiBadge>
          </EuiButton>
        </div>
        {isFlyoutVisible && (
          <EuiFlyout onClose={() => setIsFlyoutVisible(false)} aria-labelledby="flyoutTitle">
            <EuiFlyoutHeader hasBorder>
              <EuiFlexGroup
                className="dscSidebarFlyout__header"
                gutterSize="none"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon onClick={() => setIsFlyoutVisible(false)} iconType="arrowLeft" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2 id="flyoutTitle">
                      {i18n.translate('discover.fieldList.flyoutHeading', {
                        defaultMessage: 'Field list',
                      })}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <DiscoverSidebar
                {...props}
                fieldFilter={fieldFilter}
                setFieldFilter={setFieldFilter}
                mobile={true}
              />
            </EuiFlyoutBody>
          </EuiFlyout>
        )}
      </EuiShowFor>
    </>
  );
}
