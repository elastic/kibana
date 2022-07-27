/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { UiCounterMetricType } from '@kbn/analytics';
import {
  EuiTitle,
  EuiHideFor,
  EuiShowFor,
  EuiButton,
  EuiBadge,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiIcon,
  EuiLink,
  EuiPortal,
} from '@elastic/eui';
import type { DataViewField, DataView, DataViewAttributes } from '@kbn/data-views-plugin/public';
import { SavedObject } from '@kbn/core/types';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getDefaultFieldFilter } from './lib/field_filter';
import { DiscoverSidebar } from './discover_sidebar';
import { AppState } from '../../services/discover_state';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { DISCOVER_TOUR_STEP_ANCHOR_IDS } from '../../../../components/discover_tour';
import type { DataTableRecord } from '../../../../types';

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
   * hits fetched from ES, displayed in the doc table
   */
  documents?: DataTableRecord[];
  /**
   * a statistics of the distribution of fields in the given hits
   */
  fieldCounts?: Record<string, number>;
  /**
   * List of available index patterns
   */
  indexPatternList: Array<SavedObject<DataViewAttributes>>;
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
  onAddFilter: (field: DataViewField | string, value: string, type: '+' | '-') => void;
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
  selectedIndexPattern?: DataView;
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
   * Read from the Fields API
   */
  useNewFieldsApi: boolean;
  /**
   * callback to execute on edit runtime field
   */
  onFieldEdited: () => void;
  /**
   * callback to execute on create dataview
   */
  onDataViewCreated: (dataView: DataView) => void;
  /**
   * Discover view mode
   */
  viewMode: VIEW_MODE;
}

/**
 * Component providing 2 different renderings for the sidebar depending on available screen space
 * Desktop: Sidebar view, all elements are visible
 * Mobile: Index pattern selector is visible and a button to trigger a flyout with all elements
 */
export function DiscoverSidebarResponsive(props: DiscoverSidebarResponsiveProps) {
  const services = useDiscoverServices();
  const { documents, fieldCounts, selectedIndexPattern, onFieldEdited, onDataViewCreated } = props;
  const [fieldFilter, setFieldFilter] = useState(getDefaultFieldFilter());
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const closeFieldEditor = useRef<() => void | undefined>();
  const closeDataViewEditor = useRef<() => void | undefined>();

  useEffect(() => {
    const cleanup = () => {
      if (closeFieldEditor?.current) {
        closeFieldEditor?.current();
      }
      if (closeDataViewEditor?.current) {
        closeDataViewEditor?.current();
      }
    };
    return () => {
      // Make sure to close the editor when unmounting
      cleanup();
    };
  }, []);

  const setFieldEditorRef = useCallback((ref: () => void | undefined) => {
    closeFieldEditor.current = ref;
  }, []);

  const setDataViewEditorRef = useCallback((ref: () => void | undefined) => {
    closeDataViewEditor.current = ref;
  }, []);

  const closeFlyout = useCallback(() => {
    setIsFlyoutVisible(false);
  }, []);

  const { dataViewFieldEditor, dataViewEditor } = services;

  const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());

  const editField = useMemo(
    () =>
      canEditDataView && selectedIndexPattern
        ? (fieldName?: string) => {
            const ref = dataViewFieldEditor.openEditor({
              ctx: {
                dataView: selectedIndexPattern,
              },
              fieldName,
              onSave: async () => {
                onFieldEdited();
              },
            });
            if (setFieldEditorRef) {
              setFieldEditorRef(ref);
            }
            if (closeFlyout) {
              closeFlyout();
            }
          }
        : undefined,
    [
      canEditDataView,
      closeFlyout,
      dataViewFieldEditor,
      selectedIndexPattern,
      setFieldEditorRef,
      onFieldEdited,
    ]
  );

  const createNewDataView = useMemo(
    () =>
      canEditDataView
        ? () => {
            const ref = dataViewEditor.openEditor({
              onSave: async (dataView) => {
                onDataViewCreated(dataView);
              },
            });
            if (setDataViewEditorRef) {
              setDataViewEditorRef(ref);
            }
            if (closeFlyout) {
              closeFlyout();
            }
          }
        : undefined,
    [canEditDataView, dataViewEditor, setDataViewEditorRef, closeFlyout, onDataViewCreated]
  );

  if (!selectedIndexPattern) {
    return null;
  }

  return (
    <>
      {!props.isClosed && (
        <EuiHideFor sizes={['xs', 's']}>
          <DiscoverSidebar
            {...props}
            documents={documents}
            fieldFilter={fieldFilter}
            fieldCounts={fieldCounts}
            setFieldFilter={setFieldFilter}
            editField={editField}
            createNewDataView={createNewDataView}
          />
        </EuiHideFor>
      )}
      <EuiShowFor sizes={['xs', 's']}>
        <div className="dscSidebar__mobile">
          <EuiButton
            contentProps={{
              className: 'dscSidebar__mobileButton',
              id: DISCOVER_TOUR_STEP_ANCHOR_IDS.addFields,
            }}
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
                  documents={documents}
                  fieldCounts={fieldCounts}
                  fieldFilter={fieldFilter}
                  setFieldFilter={setFieldFilter}
                  alwaysShowActionButtons={true}
                  setFieldEditorRef={setFieldEditorRef}
                  closeFlyout={closeFlyout}
                  editField={editField}
                  createNewDataView={createNewDataView}
                  showDataViewPicker={true}
                />
              </div>
            </EuiFlyout>
          </EuiPortal>
        )}
      </EuiShowFor>
    </>
  );
}
