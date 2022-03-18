/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  EuiSpacer,
  EuiIcon,
  EuiLink,
  EuiPortal,
} from '@elastic/eui';
import { useDiscoverServices } from '../../../../utils/use_discover_services';
import type {
  DataViewField,
  DataView,
  DataViewAttributes,
} from '../../../../../../data_views/public';
import { SavedObject } from '../../../../../../../core/types';
import { getDefaultFieldFilter } from './lib/field_filter';
import { DiscoverSidebar } from './discover_sidebar';
import { AppState } from '../../services/discover_state';
import { AvailableFields$, DataDocuments$ } from '../../utils/use_saved_search';
import { calcFieldCounts } from '../../utils/calc_field_counts';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { FetchStatus } from '../../../types';

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
  useNewFieldsApi?: boolean;
  /**
   * callback to execute on edit runtime field
   */
  onEditRuntimeField: () => void;
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
 * Mobile: Index pattern selector is visible and a button to trigger a flyout with all elements
 */
export function DiscoverSidebarResponsive(props: DiscoverSidebarResponsiveProps) {
  const services = useDiscoverServices();
  const { selectedIndexPattern, onEditRuntimeField, useNewFieldsApi, onDataViewCreated } = props;
  const [fieldFilter, setFieldFilter] = useState(getDefaultFieldFilter());
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  /**
   * fieldCounts are used to determine which fields are actually used in the given set of documents
   */
  const fieldCounts = useRef<Record<string, number> | null>(null);
  if (fieldCounts.current === null) {
    fieldCounts.current = calcFieldCounts(props.documents$.getValue().result, selectedIndexPattern);
  }

  const [documentState, setDocumentState] = useState(props.documents$.getValue());
  useEffect(() => {
    const subscription = props.documents$.subscribe((next) => {
      if (next.fetchStatus !== documentState.fetchStatus) {
        if (next.result) {
          fieldCounts.current = calcFieldCounts(next.result, selectedIndexPattern!);
        }
        setDocumentState({ ...documentState, ...next });
      }
    });
    return () => subscription.unsubscribe();
  }, [props.documents$, selectedIndexPattern, documentState, setDocumentState]);

  useEffect(() => {
    // when index pattern changes fieldCounts needs to be cleaned up to prevent displaying
    // fields of the previous index pattern
    fieldCounts.current = {};
  }, [selectedIndexPattern]);

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
      selectedIndexPattern,
      availableFields$,
      fieldCounts.current,
      documentState.result,
      props.columns.length,
    ]
  );

  const editField = useCallback(
    (fieldName?: string) => {
      const indexPatternFieldEditPermission =
        dataViewFieldEditor?.userPermissions.editIndexPattern();
      const canEditIndexPatternField = !!indexPatternFieldEditPermission && useNewFieldsApi;
      if (!canEditIndexPatternField || !selectedIndexPattern) {
        return;
      }
      const ref = dataViewFieldEditor.openEditor({
        ctx: {
          dataView: selectedIndexPattern,
        },
        fieldName,
        onSave: async () => {
          onEditRuntimeField();
        },
      });
      if (setFieldEditorRef) {
        setFieldEditorRef(ref);
      }
      if (closeFlyout) {
        closeFlyout();
      }
    },
    [
      closeFlyout,
      dataViewFieldEditor,
      selectedIndexPattern,
      setFieldEditorRef,
      onEditRuntimeField,
      useNewFieldsApi,
    ]
  );

  const createNewDataView = useCallback(() => {
    const indexPatternFieldEditPermission = dataViewEditor.userPermissions.editDataView;
    if (!indexPatternFieldEditPermission) {
      return;
    }
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

  if (!selectedIndexPattern) {
    return null;
  }

  return (
    <>
      {!props.isClosed && (
        <EuiHideFor sizes={['xs', 's']}>
          <DiscoverSidebar
            {...props}
            documents={documentState.result}
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
