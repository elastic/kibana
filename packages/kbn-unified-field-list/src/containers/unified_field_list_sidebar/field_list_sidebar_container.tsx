/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useEffect,
} from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import {
  EuiBadge,
  EuiButton,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiHideFor,
  EuiIcon,
  EuiLink,
  EuiPortal,
  EuiShowFor,
  EuiTitle,
} from '@elastic/eui';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  useExistingFieldsFetcher,
  type ExistingFieldsFetcher,
} from '../../hooks/use_existing_fields';
import { useQuerySubscriber } from '../../hooks/use_query_subscriber';
import { useSidebarToggle } from '../../hooks/use_sidebar_toggle';
import {
  UnifiedFieldListSidebar,
  type UnifiedFieldListSidebarCustomizableProps,
  type UnifiedFieldListSidebarProps,
} from './field_list_sidebar';
import { createStateService } from '../services/state_service';
import type {
  UnifiedFieldListSidebarContainerCreationOptions,
  UnifiedFieldListSidebarContainerStateService,
  SearchMode,
} from '../../types';

export interface UnifiedFieldListSidebarContainerApi {
  isSidebarCollapsed$: Observable<boolean>;
  refetchFieldsExistenceInfo: ExistingFieldsFetcher['refetchFieldsExistenceInfo'];
  closeFieldListFlyout: () => void;
  // no user permission or missing dataViewFieldEditor service will result in `undefined` API methods
  createField: undefined | (() => void);
  editField: undefined | ((fieldName: string) => void);
  deleteField: undefined | ((fieldName: string) => void);
}

export type UnifiedFieldListSidebarContainerProps = Omit<
  UnifiedFieldListSidebarCustomizableProps,
  'services'
> & {
  /**
   * Required services.
   */
  services: UnifiedFieldListSidebarCustomizableProps['services'] & {
    dataViewFieldEditor?: IndexPatternFieldEditorStart;
  };

  /**
   * Return static configuration options which don't need to change
   */
  getCreationOptions: () => UnifiedFieldListSidebarContainerCreationOptions;

  /**
   * Custom content to render at the top of field list in the flyout (for example a data view picker)
   */
  prependInFlyout?: () => UnifiedFieldListSidebarProps['prepend'];

  /**
   * Customization for responsive behaviour. Default: `responsive`.
   */
  variant?: 'responsive' | 'button-and-flyout-always' | 'list-always';

  /**
   * Custom logic for determining which field is selected. Otherwise, use `workspaceSelectedFieldNames` prop.
   */
  onSelectedFieldFilter?: UnifiedFieldListSidebarProps['onSelectedFieldFilter'];

  /**
   * Callback to execute after editing/deleting a runtime field
   */
  onFieldEdited?: (options?: {
    removedFieldName?: string;
    editedFieldName?: string;
  }) => Promise<void>;
};

/**
 * Component providing 2 different renderings for the sidebar depending on available screen space
 * Desktop: Sidebar view, all elements are visible
 * Mobile: A button to trigger a flyout with all elements
 */
const UnifiedFieldListSidebarContainer = forwardRef<
  UnifiedFieldListSidebarContainerApi,
  UnifiedFieldListSidebarContainerProps
>(function UnifiedFieldListSidebarContainer(props, componentRef) {
  const {
    getCreationOptions,
    services,
    dataView,
    workspaceSelectedFieldNames,
    prependInFlyout,
    variant = 'responsive',
    onFieldEdited,
  } = props;
  const [stateService] = useState<UnifiedFieldListSidebarContainerStateService>(
    createStateService({ options: getCreationOptions() })
  );
  const { data, dataViewFieldEditor } = services;
  const [isFieldListFlyoutVisible, setIsFieldListFlyoutVisible] = useState<boolean>(false);
  const { isSidebarCollapsed, onToggleSidebar } = useSidebarToggle({ stateService });
  const [isSidebarCollapsed$] = useState(() => new BehaviorSubject(isSidebarCollapsed));

  const canEditDataView =
    Boolean(dataViewFieldEditor?.userPermissions.editIndexPattern()) ||
    Boolean(dataView && !dataView.isPersisted());
  const closeFieldEditor = useRef<() => void | undefined>();
  const setFieldEditorRef = useCallback((ref: () => void | undefined) => {
    closeFieldEditor.current = ref;
  }, []);

  const closeFieldListFlyout = useCallback(() => {
    setIsFieldListFlyoutVisible(false);
  }, []);

  const querySubscriberResult = useQuerySubscriber({
    data,
    timeRangeUpdatesType: stateService.creationOptions.timeRangeUpdatesType,
  });
  const searchMode: SearchMode | undefined = querySubscriberResult.searchMode;
  const isAffectedByGlobalFilter = Boolean(querySubscriberResult.filters?.length);

  const { isProcessing, refetchFieldsExistenceInfo } = useExistingFieldsFetcher({
    disableAutoFetching: stateService.creationOptions.disableFieldsExistenceAutoFetching,
    dataViews: searchMode === 'documents' && dataView ? [dataView] : [],
    query: querySubscriberResult.query,
    filters: querySubscriberResult.filters,
    fromDate: querySubscriberResult.fromDate,
    toDate: querySubscriberResult.toDate,
    services,
  });

  const editField = useMemo(
    () =>
      dataView && dataViewFieldEditor && searchMode === 'documents' && canEditDataView
        ? (fieldName?: string) => {
            const ref = dataViewFieldEditor.openEditor({
              ctx: {
                dataView,
              },
              fieldName,
              onSave: async () => {
                if (onFieldEdited) {
                  await onFieldEdited({ editedFieldName: fieldName });
                }
              },
            });
            setFieldEditorRef(ref);
            closeFieldListFlyout();
          }
        : undefined,
    [
      searchMode,
      canEditDataView,
      dataViewFieldEditor,
      dataView,
      setFieldEditorRef,
      closeFieldListFlyout,
      onFieldEdited,
    ]
  );

  const deleteField = useMemo(
    () =>
      dataView && dataViewFieldEditor && editField
        ? (fieldName: string) => {
            const ref = dataViewFieldEditor.openDeleteModal({
              ctx: {
                dataView,
              },
              fieldName,
              onDelete: async () => {
                if (onFieldEdited) {
                  await onFieldEdited({ removedFieldName: fieldName });
                }
              },
            });
            setFieldEditorRef(ref);
            closeFieldListFlyout();
          }
        : undefined,
    [
      dataView,
      setFieldEditorRef,
      editField,
      closeFieldListFlyout,
      dataViewFieldEditor,
      onFieldEdited,
    ]
  );

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

  useEffect(() => {
    isSidebarCollapsed$.next(isSidebarCollapsed);
  }, [isSidebarCollapsed, isSidebarCollapsed$]);

  useImperativeHandle(
    componentRef,
    () => ({
      isSidebarCollapsed$,
      refetchFieldsExistenceInfo,
      closeFieldListFlyout,
      createField: editField,
      editField,
      deleteField,
    }),
    [isSidebarCollapsed$, refetchFieldsExistenceInfo, closeFieldListFlyout, editField, deleteField]
  );

  if (!dataView) {
    return null;
  }

  const commonSidebarProps: UnifiedFieldListSidebarProps = {
    ...props,
    searchMode,
    stateService,
    isProcessing,
    isAffectedByGlobalFilter,
    onEditField: editField,
    onDeleteField: deleteField,
    compressed: stateService.creationOptions.compressed ?? false,
    buttonAddFieldVariant: stateService.creationOptions.buttonAddFieldVariant ?? 'primary',
  };

  if (stateService.creationOptions.showSidebarToggleButton) {
    commonSidebarProps.isSidebarCollapsed = isSidebarCollapsed;
    commonSidebarProps.onToggleSidebar = onToggleSidebar;
  }

  const buttonPropsToTriggerFlyout = stateService.creationOptions.buttonPropsToTriggerFlyout;

  const renderListVariant = () => {
    return <UnifiedFieldListSidebar {...commonSidebarProps} />;
  };

  const renderButtonVariant = () => {
    return (
      <>
        <div className="unifiedFieldListSidebar__mobile">
          <EuiButton
            {...buttonPropsToTriggerFlyout}
            contentProps={{
              ...buttonPropsToTriggerFlyout?.contentProps,
              className: 'unifiedFieldListSidebar__mobileButton',
            }}
            fullWidth
            onClick={() => setIsFieldListFlyoutVisible(true)}
          >
            <FormattedMessage
              id="unifiedFieldList.fieldListSidebar.fieldsMobileButtonLabel"
              defaultMessage="Fields"
            />
            <EuiBadge
              className="unifiedFieldListSidebar__mobileBadge"
              color={workspaceSelectedFieldNames?.[0] === '_source' ? 'default' : 'accent'}
            >
              {!workspaceSelectedFieldNames?.length || workspaceSelectedFieldNames[0] === '_source'
                ? 0
                : workspaceSelectedFieldNames.length}
            </EuiBadge>
          </EuiButton>
        </div>
        {isFieldListFlyoutVisible && (
          <EuiPortal>
            <EuiFlyout
              size="s"
              onClose={() => setIsFieldListFlyoutVisible(false)}
              aria-labelledby="flyoutTitle"
              ownFocus
            >
              <EuiFlyoutHeader hasBorder>
                <EuiTitle size="s">
                  <h2 id="flyoutTitle">
                    <EuiLink color="text" onClick={() => setIsFieldListFlyoutVisible(false)}>
                      <EuiIcon
                        className="eui-alignBaseline"
                        aria-label={i18n.translate(
                          'unifiedFieldList.fieldListSidebar.flyoutBackIcon',
                          {
                            defaultMessage: 'Back',
                          }
                        )}
                        type="arrowLeft"
                      />{' '}
                      <strong>
                        {i18n.translate('unifiedFieldList.fieldListSidebar.flyoutHeading', {
                          defaultMessage: 'Field list',
                        })}
                      </strong>
                    </EuiLink>
                  </h2>
                </EuiTitle>
              </EuiFlyoutHeader>
              <UnifiedFieldListSidebar
                {...commonSidebarProps}
                alwaysShowActionButton={true}
                buttonAddFieldVariant="primary" // always for the flyout
                isSidebarCollapsed={undefined}
                prepend={prependInFlyout?.()}
              />
            </EuiFlyout>
          </EuiPortal>
        )}
      </>
    );
  };

  if (variant === 'button-and-flyout-always') {
    return renderButtonVariant();
  }

  if (variant === 'list-always') {
    return renderListVariant();
  }

  return (
    <>
      <EuiHideFor sizes={['xs', 's']}>{renderListVariant()}</EuiHideFor>
      <EuiShowFor sizes={['xs', 's']}>{renderButtonVariant()}</EuiShowFor>
    </>
  );
});

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default UnifiedFieldListSidebarContainer;
