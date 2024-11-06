/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { withRouter, RouteComponentProps, useLocation } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiBadge,
  EuiCallOut,
  EuiCode,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataViewType, RuntimeField, DataView } from '@kbn/data-views-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SavedObjectRelation } from '@kbn/saved-objects-management-plugin/public';
import { pickBy } from 'lodash';
import type * as CSS from 'csstype';
import { RollupDeprecationTooltip } from '@kbn/rollup';
import { IndexPatternManagmentContext } from '../../types';
import { Tabs } from './tabs';
import { IndexHeader } from './index_header';
import { removeDataView, RemoveDataViewProps } from './remove_data_view';

import { useStateSelector } from '../../management_app/state_utils';

const codeStyle: CSS.Properties = {
  marginLeft: '8px',
  overflowWrap: 'anywhere',
};

export interface EditIndexPatternProps extends RouteComponentProps {
  indexPattern: DataView;
}

export interface SavedObjectRelationWithTitle extends SavedObjectRelation {
  title: string;
}

const mappingConflictHeader = i18n.translate(
  'indexPatternManagement.editIndexPattern.mappingConflictHeader',
  {
    defaultMessage: 'Mapping conflict',
  }
);

const securityDataView = i18n.translate(
  'indexPatternManagement.editIndexPattern.badge.securityDataViewTitle',
  {
    defaultMessage: 'Security Data View',
  }
);

const securitySolution = 'security-solution';

const getCompositeRuntimeFields = (dataView: DataView) =>
  pickBy(dataView.getAllRuntimeFields(), (fld) => fld.type === 'composite');

import {
  dataViewSelector,
  allowedTypesSelector,
  relationshipsSelector,
  tagsSelector,
  isRefreshingSelector,
  defaultIndexSelector,
  fieldsSelector,
} from '../../management_app/data_view_mgmt_selectors';

export const EditIndexPattern = withRouter(
  ({ indexPattern, history, location }: EditIndexPatternProps) => {
    const {
      uiSettings,
      overlays,
      chrome,
      dataViews,
      IndexPatternEditor,
      savedObjectsManagement,
      application,
      dataViewMgmtService,
      ...startServices
    } = useKibana<IndexPatternManagmentContext>().services;
    const dataView = useStateSelector(dataViewMgmtService.state$, dataViewSelector);
    const allowedTypes = useStateSelector(dataViewMgmtService.state$, allowedTypesSelector);
    const relationships = useStateSelector(dataViewMgmtService.state$, relationshipsSelector);
    const tags = useStateSelector(dataViewMgmtService.state$, tagsSelector);
    const isRefreshing = useStateSelector(dataViewMgmtService.state$, isRefreshingSelector);
    const defaultIndex = useStateSelector(dataViewMgmtService.state$, defaultIndexSelector);
    const fields = useStateSelector(dataViewMgmtService.state$, fieldsSelector);
    const fieldConflictCount = useStateSelector(
      dataViewMgmtService.state$,
      (state) => state.fieldConflictCount
    );
    const conflictFieldsUrl = useStateSelector(
      dataViewMgmtService.state$,
      (state) => state.conflictFieldsUrl
    );
    // has default
    const [compositeRuntimeFields, setCompositeRuntimeFields] = useState<
      Record<string, RuntimeField>
    >(() => getCompositeRuntimeFields(indexPattern));

    const [showEditDialog, setShowEditDialog] = useState<boolean>(false);

    // subscribe and unsubscribe to hash change events
    useEffect(() => {
      // dispatch synthetic hash change event to update hash history objects
      // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
      const unlistenParentHistory = history.listen(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      return () => {
        unlistenParentHistory();
      };
    }, [history]);

    const removeHandler = removeDataView({
      dataViews,
      uiSettings,
      overlays,
      onDelete: () => {
        history.push('');
      },
      startServices,
    });

    const isRollup =
      new URLSearchParams(useLocation().search).get('type') === DataViewType.ROLLUP &&
      dataViews.getRollupsEnabled();
    const displayIndexPatternEditor = showEditDialog ? (
      <IndexPatternEditor
        onSave={() => {
          dataViewMgmtService.refreshFields();
          setShowEditDialog(false);
        }}
        onCancel={() => setShowEditDialog(false)}
        defaultTypeIsRollup={isRollup}
        editData={dataView}
      />
    ) : (
      <></>
    );
    const editPattern = () => {
      setShowEditDialog(true);
    };

    const indexPatternHeading = i18n.translate(
      'indexPatternManagement.editIndexPattern.indexPatternHeading',
      {
        defaultMessage: 'Index pattern:',
      }
    );

    const timeFilterHeading = i18n.translate(
      'indexPatternManagement.editIndexPattern.timeFilterHeading',
      {
        defaultMessage: 'Time field:',
      }
    );

    const mappingConflictLabel = i18n.translate(
      'indexPatternManagement.editIndexPattern.mappingConflictLabel',
      {
        defaultMessage:
          '{conflictFieldsLength, plural, one {A field is} other {# fields are}} defined as several types (string, integer, etc) across the indices that match this pattern. You may still be able to use these conflict fields in parts of Kibana, but they will be unavailable for functions that require Kibana to know their type. Correcting this issue will require reindexing your data.',
        values: { conflictFieldsLength: fieldConflictCount },
      }
    );

    const headingAriaLabel = i18n.translate('indexPatternManagement.editDataView.detailsAria', {
      defaultMessage: 'Data view details',
    });

    chrome.docTitle.change(indexPattern.getName());

    const userEditPermission = dataViews.getCanSaveSync();

    const warning =
      (indexPattern.namespaces && indexPattern.namespaces.length > 1) ||
      indexPattern.namespaces.includes('*') ? (
        <FormattedMessage
          id="indexPatternManagement.editDataView.deleteWarningWithNamespaces"
          defaultMessage="Delete the data view {dataViewName} from every space it is shared in. You can't undo this action."
          values={{
            dataViewName: <EuiCode>{indexPattern.getName()}</EuiCode>,
          }}
        />
      ) : (
        <FormattedMessage
          id="indexPatternManagement.editDataView.deleteWarning"
          defaultMessage="The data view {dataViewName} will be deleted. You can't undo this action."
          values={{
            dataViewName: <EuiCode>{indexPattern.getName()}</EuiCode>,
          }}
        />
      );

    return (
      <div data-test-subj="editIndexPattern" role="region" aria-label={headingAriaLabel}>
        {dataView && (
          <IndexHeader
            indexPattern={dataView}
            setDefault={() => dataViewMgmtService.setDefaultDataView()}
            editIndexPatternClick={editPattern}
            deleteIndexPatternClick={() =>
              removeHandler([indexPattern as RemoveDataViewProps], <div>{warning}</div>)
            }
            defaultIndex={defaultIndex}
            canSave={userEditPermission}
          >
            <EuiHorizontalRule margin="none" />
            <EuiSpacer size="l" />
            <EuiFlexGroup wrap gutterSize="l" alignItems="center">
              {Boolean(indexPattern.title) && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="none" alignItems="center">
                    <EuiText size="s">{indexPatternHeading}</EuiText>
                    <EuiCode data-test-subj="currentIndexPatternTitle" style={codeStyle}>
                      {indexPattern.title}
                    </EuiCode>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
              {Boolean(indexPattern.timeFieldName) && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="none" alignItems="center">
                    <EuiText size="s">{timeFilterHeading}</EuiText>
                    <EuiCode data-test-subj="currentIndexPatternTimeField" style={codeStyle}>
                      {indexPattern.timeFieldName}
                    </EuiCode>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
              {indexPattern.id && indexPattern.id.indexOf(securitySolution) === 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge>{securityDataView}</EuiBadge>
                </EuiFlexItem>
              )}
              {tags.map((tag) => (
                <EuiFlexItem grow={false} key={tag.key}>
                  {tag.key === 'default' ? (
                    <EuiBadge
                      iconType="starFilled"
                      color="default"
                      data-test-subj={tag['data-test-subj']}
                    >
                      {tag.name}
                    </EuiBadge>
                  ) : tag.key === 'rollup' ? (
                    <RollupDeprecationTooltip>
                      <EuiBadge color="warning">{tag.name}</EuiBadge>
                    </RollupDeprecationTooltip>
                  ) : (
                    <EuiBadge color="hollow">{tag.name}</EuiBadge>
                  )}
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            {fieldConflictCount > 0 && (
              <>
                <EuiSpacer />
                <EuiCallOut
                  title={mappingConflictHeader}
                  color="warning"
                  iconType="warning"
                  data-test-subj="dataViewMappingConflict"
                >
                  <p>{mappingConflictLabel}</p>
                  <EuiLink
                    data-test-subj="viewDataViewMappingConflictsButton"
                    href={conflictFieldsUrl}
                  >
                    {i18n.translate(
                      'indexPatternManagement.editIndexPattern.viewMappingConflictButton',
                      {
                        defaultMessage: 'View conflicts',
                      }
                    )}
                  </EuiLink>
                </EuiCallOut>
              </>
            )}
          </IndexHeader>
        )}
        <EuiSpacer size="xl" />
        {dataView && (
          <Tabs
            indexPattern={dataView}
            saveIndexPattern={dataViews.updateSavedObject.bind(dataViews)}
            fields={fields}
            relationships={relationships}
            allowedTypes={allowedTypes}
            history={history}
            location={location}
            compositeRuntimeFields={compositeRuntimeFields}
            refreshFields={() => {
              dataViewMgmtService.refreshFields();
              setCompositeRuntimeFields(getCompositeRuntimeFields(indexPattern));
            }}
            refreshIndexPatternClick={() => dataViewMgmtService.refreshFields()}
            isRefreshing={isRefreshing}
          />
        )}
        {displayIndexPatternEditor}
      </div>
    );
  }
);
