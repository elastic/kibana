/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';
import { sortBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { UiCounterMetricType } from '@kbn/analytics';
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
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { DiscoverIndexPattern } from './discover_index_pattern';
import { IndexPatternAttributes } from '../../../../../../../data/common';
import { SavedObject } from '../../../../../../../../core/types';
import { IndexPatternField, IndexPattern } from '../../../../../../../data/public';
import { getDefaultFieldFilter } from './lib/field_filter';
import { DiscoverSidebar } from './discover_sidebar';
import { DiscoverServices } from '../../../../../build_services';
import { ElasticSearchHit } from '../../../../doc_views/doc_views_types';
import { AppState } from '../../services/discover_state';
import { DiscoverIndexPatternManagement } from './discover_index_pattern_management';

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
   * Callback function when changing an index pattern
   */
  onChangeIndexPattern: (id: string) => void;
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
   * callback to execute on edit runtime field
   */
  onEditRuntimeField: () => void;
}

/**
 * Component providing 2 different renderings for the sidebar depending on available screen space
 * Desktop: Sidebar view, all elements are visible
 * Mobile: Index pattern selector is visible and a button to trigger a flyout with all elements
 */
export function DiscoverSidebarResponsive(props: DiscoverSidebarResponsiveProps) {
  const [fieldFilter, setFieldFilter] = useState(getDefaultFieldFilter());
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const closeFieldEditor = useRef<() => void | undefined>();

  useEffect(() => {
    const cleanup = () => {
      if (closeFieldEditor?.current) {
        closeFieldEditor?.current();
      }
    };
    return () => {
      // Make sure to close the editor when unmounting
      cleanup();
    };
  }, []);

  if (!props.selectedIndexPattern) {
    return null;
  }

  const setFieldEditorRef = (ref: () => void | undefined) => {
    closeFieldEditor.current = ref;
  };

  const closeFlyout = () => {
    setIsFlyoutVisible(false);
  };

  const { indexPatternFieldEditor } = props.services;
  const indexPatternFieldEditPermission = indexPatternFieldEditor?.userPermissions.editIndexPattern();
  const canEditIndexPatternField = !!indexPatternFieldEditPermission && props.useNewFieldsApi;

  const editField = (fieldName?: string) => {
    if (!canEditIndexPatternField || !props.selectedIndexPattern) {
      return;
    }
    const ref = indexPatternFieldEditor.openEditor({
      ctx: {
        indexPattern: props.selectedIndexPattern,
      },
      fieldName,
      onSave: async () => {
        props.onEditRuntimeField();
      },
    });
    if (setFieldEditorRef) {
      setFieldEditorRef(ref);
    }
    if (closeFlyout) {
      closeFlyout();
    }
  };

  return (
    <>
      {props.isClosed ? null : (
        <EuiHideFor sizes={['xs', 's']}>
          <DiscoverSidebar
            {...props}
            fieldFilter={fieldFilter}
            setFieldFilter={setFieldFilter}
            editField={editField}
          />
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
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={true}>
                <DiscoverIndexPattern
                  onChangeIndexPattern={props.onChangeIndexPattern}
                  selectedIndexPattern={props.selectedIndexPattern}
                  indexPatternList={sortBy(props.indexPatternList, (o) => o.attributes.title)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DiscoverIndexPatternManagement
                  services={props.services}
                  selectedIndexPattern={props.selectedIndexPattern}
                  editField={editField}
                  useNewFieldsApi={props.useNewFieldsApi}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
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
                  setFieldEditorRef={setFieldEditorRef}
                  closeFlyout={closeFlyout}
                  editField={editField}
                />
              </div>
            </EuiFlyout>
          </EuiPortal>
        )}
      </EuiShowFor>
    </>
  );
}
