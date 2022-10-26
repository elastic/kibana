/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { UiCounterMetricType } from '@kbn/analytics';
import {
  EuiBadge,
  EuiButton,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiHideFor,
  EuiIcon,
  EuiLink,
  EuiPortal,
  EuiProgress,
  EuiShowFor,
  EuiTitle,
} from '@elastic/eui';
import type { DataView, DataViewField, DataViewListItem } from '@kbn/data-views-plugin/public';
import { useExistingFieldsFetcher } from '@kbn/unified-field-list-plugin/public';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getDefaultFieldFilter } from './lib/field_filter';
import { DiscoverSidebar } from './discover_sidebar';
import { AvailableFields$, DataDocuments$, RecordRawType } from '../../hooks/use_saved_search';
import { calcFieldCounts } from '../../utils/calc_field_counts';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { FetchStatus } from '../../../types';
import { DISCOVER_TOUR_STEP_ANCHOR_IDS } from '../../../../components/discover_tour';
import { getRawRecordType } from '../../utils/get_raw_record_type';
import { useAppStateSelector } from '../../services/discover_app_state_container';

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
  documents$: DataDocuments$;
  /**
   * List of available data views
   */
  dataViewList: DataViewListItem[];
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
  onAddFilter?: (field: DataViewField | string, value: unknown, type: '+' | '-') => void;
  /**
   * Callback function when changing an data view
   */
  onChangeDataView: (id: string) => void;
  /**
   * Callback function when removing a field
   * @param fieldName
   */
  onRemoveField: (fieldName: string) => void;
  /**
   * Currently selected data view
   */
  selectedDataView?: DataView;
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
  onFieldEdited: () => Promise<void>;
  /**
   * callback to execute on create dataview
   */
  onDataViewCreated: (dataView: DataView) => void;
  /**
   * Discover view mode
   */
  viewMode: VIEW_MODE;
  /**
   * list of available fields fetched from ES
   */
  availableFields$: AvailableFields$;
}

/**
 * Component providing 2 different renderings for the sidebar depending on available screen space
 * Desktop: Sidebar view, all elements are visible
 * Mobile: Data view selector is visible and a button to trigger a flyout with all elements
 */
export function DiscoverSidebarResponsive(props: DiscoverSidebarResponsiveProps) {
  const services = useDiscoverServices();
  const { data, dataViews, core } = services;
  const isPlainRecord = useAppStateSelector(
    (state) => getRawRecordType(state.query) === RecordRawType.PLAIN
  );
  const { selectedDataView, onFieldEdited, onDataViewCreated } = props;
  const [fieldFilter, setFieldFilter] = useState(getDefaultFieldFilter());
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  /**
   * fieldCounts are used to determine which fields are actually used in the given set of documents
   */
  const fieldCounts = useRef<Record<string, number> | null>(null);
  if (fieldCounts.current === null) {
    fieldCounts.current = calcFieldCounts(props.documents$.getValue().result!, selectedDataView);
  }

  const [documentState, setDocumentState] = useState(props.documents$.getValue());
  useEffect(() => {
    const subscription = props.documents$.subscribe((next) => {
      if (next.fetchStatus !== documentState.fetchStatus) {
        if (next.result) {
          fieldCounts.current = calcFieldCounts(next.result, selectedDataView!);
        }
        setDocumentState({ ...documentState, ...next });
      }
    });
    return () => subscription.unsubscribe();
  }, [props.documents$, selectedDataView, documentState, setDocumentState]);

  useEffect(() => {
    // when data view changes fieldCounts needs to be cleaned up to prevent displaying
    // fields of the previous data view
    fieldCounts.current = {};
  }, [selectedDataView]);

  const query = useAppStateSelector((state) => state.query);
  const filters = useAppStateSelector((state) => state.filters);
  const dateRange = data.query.timefilter.timefilter.getTime();

  const { isProcessing, refetchFieldsExistenceInfo } = useExistingFieldsFetcher({
    dataViews: selectedDataView ? [selectedDataView] : [],
    query: query!,
    filters: filters!,
    fromDate: dateRange.from,
    toDate: dateRange.to,
    services: {
      data,
      dataViews,
      core,
    },
  });

  const onFieldEditedExtended = useCallback(async () => {
    await onFieldEdited();
    refetchFieldsExistenceInfo();
  }, [onFieldEdited, refetchFieldsExistenceInfo]);

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
  const { availableFields$ } = props;

  const canEditDataView =
    Boolean(dataViewEditor?.userPermissions.editDataView()) || !selectedDataView?.isPersisted();

  useEffect(
    () => {
      // For an external embeddable like the Field stats
      // it is useful to know what fields are populated in the docs fetched
      // or what fields are selected by the user

      const fieldCnts = fieldCounts.current ?? {};

      const availableFields = props.columns.length > 0 ? props.columns : Object.keys(fieldCnts);
      availableFields$.next({
        fetchStatus: FetchStatus.COMPLETE,
        fields: availableFields,
      });
    },
    // Using columns.length here instead of columns to avoid array reference changing
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      selectedDataView,
      availableFields$,
      fieldCounts.current,
      documentState.result,
      props.columns.length,
    ]
  );

  const editField = useMemo(
    () =>
      !isPlainRecord && canEditDataView && selectedDataView
        ? (fieldName?: string) => {
            const ref = dataViewFieldEditor.openEditor({
              ctx: {
                dataView: selectedDataView,
              },
              fieldName,
              onSave: async () => {
                await onFieldEditedExtended();
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
      isPlainRecord,
      canEditDataView,
      dataViewFieldEditor,
      selectedDataView,
      setFieldEditorRef,
      closeFlyout,
      onFieldEditedExtended,
    ]
  );

  const createNewDataView = useCallback(() => {
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
  }, [dataViewEditor, setDataViewEditorRef, closeFlyout, onDataViewCreated]);

  if (!selectedDataView) {
    return null;
  }

  return (
    <>
      {!props.isClosed && (
        <EuiHideFor sizes={['xs', 's']}>
          {isProcessing && <EuiProgress size="xs" color="accent" position="absolute" />}
          <DiscoverSidebar
            {...props}
            onFieldEdited={onFieldEditedExtended}
            documents={documentState.result!}
            fieldFilter={fieldFilter}
            fieldCounts={fieldCounts.current}
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
                  onFieldEdited={onFieldEditedExtended}
                  documents={documentState.result}
                  fieldCounts={fieldCounts.current}
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
