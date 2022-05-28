/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiBadge,
  EuiText,
  EuiLink,
  EuiCallOut,
  EuiCode,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  SavedObjectRelation,
  SavedObjectManagementTypeInfo,
} from '@kbn/saved-objects-management-plugin/public';
import { IndexPatternManagmentContext } from '../../types';
import { Tabs } from './tabs';
import { IndexHeader } from './index_header';
import { getTags } from '../utils';
import { removeDataView, RemoveDataViewProps } from './remove_data_view';

export interface EditIndexPatternProps extends RouteComponentProps {
  indexPattern: DataView;
}

export interface SavedObjectRelationWithTitle extends SavedObjectRelation {
  title: string;
}

const mappingAPILink = i18n.translate(
  'indexPatternManagement.editIndexPattern.timeFilterLabel.mappingAPILink',
  {
    defaultMessage: 'field mappings',
  }
);

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

export const EditIndexPattern = withRouter(
  ({ indexPattern, history, location }: EditIndexPatternProps) => {
    const { uiSettings, overlays, chrome, dataViews, savedObjectsManagement } =
      useKibana<IndexPatternManagmentContext>().services;
    const [fields, setFields] = useState<DataViewField[]>(indexPattern.getNonScriptedFields());
    const [conflictedFields, setConflictedFields] = useState<DataViewField[]>(
      indexPattern.fields.getAll().filter((field) => field.type === 'conflict')
    );
    const [defaultIndex, setDefaultIndex] = useState<string>(uiSettings.get('defaultIndex'));
    const [tags, setTags] = useState<any[]>([]);
    const [relationships, setRelationships] = useState<SavedObjectRelationWithTitle[]>([]);
    const [allowedTypes, setAllowedTypes] = useState<SavedObjectManagementTypeInfo[]>([]);

    useEffect(() => {
      savedObjectsManagement.getAllowedTypes().then((resp) => {
        setAllowedTypes(resp);
      });
    }, [savedObjectsManagement]);

    useEffect(() => {
      if (allowedTypes.length === 0) {
        return;
      }
      const allowedAsString = allowedTypes.map((item) => item.name);
      savedObjectsManagement
        .getRelationships(DATA_VIEW_SAVED_OBJECT_TYPE, indexPattern.id!, allowedAsString)
        .then((resp) => {
          setRelationships(resp.relations.map((r) => ({ ...r, title: r.meta.title! })));
        });
    }, [savedObjectsManagement, indexPattern, allowedTypes]);

    useEffect(() => {
      setFields(indexPattern.getNonScriptedFields());
      setConflictedFields(
        indexPattern.fields.getAll().filter((field) => field.type === 'conflict')
      );
    }, [indexPattern]);

    useEffect(() => {
      setTags(getTags(indexPattern, indexPattern.id === defaultIndex));
    }, [defaultIndex, indexPattern]);

    const setDefaultPattern = useCallback(() => {
      uiSettings.set('defaultIndex', indexPattern.id);
      setDefaultIndex(indexPattern.id || '');
    }, [uiSettings, indexPattern.id]);

    const removeHandler = removeDataView({
      dataViews,
      uiSettings,
      overlays,
      onDelete: () => {
        history.push('');
      },
    });

    const timeFilterHeader = i18n.translate(
      'indexPatternManagement.editIndexPattern.timeFilterHeader',
      {
        defaultMessage: "Time field: '{timeFieldName}'",
        values: { timeFieldName: indexPattern.timeFieldName },
      }
    );

    const mappingConflictLabel = i18n.translate(
      'indexPatternManagement.editIndexPattern.mappingConflictLabel',
      {
        defaultMessage:
          '{conflictFieldsLength, plural, one {A field is} other {# fields are}} defined as several types (string, integer, etc) across the indices that match this pattern. You may still be able to use these conflict fields in parts of Kibana, but they will be unavailable for functions that require Kibana to know their type. Correcting this issue will require reindexing your data.',
        values: { conflictFieldsLength: conflictedFields.length },
      }
    );

    const headingAriaLabel = i18n.translate('indexPatternManagement.editDataView.detailsAria', {
      defaultMessage: 'Data view details',
    });

    chrome.docTitle.change(indexPattern.title);

    const showTagsSection = Boolean(indexPattern.timeFieldName || (tags && tags.length > 0));
    const kibana = useKibana();
    const docsUrl = kibana.services.docLinks!.links.elasticsearch.mapping;
    const userEditPermission = dataViews.getCanSaveSync();

    const warning =
      (indexPattern.namespaces && indexPattern.namespaces.length > 1) ||
      indexPattern.namespaces.includes('*') ? (
        <FormattedMessage
          id="indexPatternManagement.editDataView.deleteWarningWithNamespaces"
          defaultMessage="Delete the data view {dataViewName} from every space it is shared in. You can't undo this action."
          values={{
            dataViewName: <EuiCode>{indexPattern.title}</EuiCode>,
          }}
        />
      ) : (
        <FormattedMessage
          id="indexPatternManagement.editDataView.deleteWarning"
          defaultMessage="The data view {dataViewName} will be deleted. You can't undo this action."
          values={{
            dataViewName: <EuiCode>{indexPattern.title}</EuiCode>,
          }}
        />
      );

    return (
      <div data-test-subj="editIndexPattern" role="region" aria-label={headingAriaLabel}>
        <IndexHeader
          indexPattern={indexPattern}
          setDefault={setDefaultPattern}
          deleteIndexPatternClick={() =>
            removeHandler([indexPattern as RemoveDataViewProps], <div>{warning}</div>)
          }
          defaultIndex={defaultIndex}
          canSave={userEditPermission}
        >
          {showTagsSection && (
            <EuiFlexGroup wrap gutterSize="s">
              {Boolean(indexPattern.timeFieldName) && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">{timeFilterHeader}</EuiBadge>
                </EuiFlexItem>
              )}
              {indexPattern.id && indexPattern.id.indexOf(securitySolution) === 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge>{securityDataView}</EuiBadge>
                </EuiFlexItem>
              )}
              {tags.map((tag: any) => (
                <EuiFlexItem grow={false} key={tag.key}>
                  <EuiBadge color="hollow">{tag.name}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
          <EuiSpacer size="m" />
          <EuiText>
            <p>
              <FormattedMessage
                id="indexPatternManagement.editIndexPattern.timeFilterLabel.timeFilterDetail"
                defaultMessage="View and edit fields in {indexPatternTitle}. Field attributes, such as type and searchability, are based on {mappingAPILink} in Elasticsearch."
                values={{
                  indexPatternTitle: <strong>{indexPattern.title}</strong>,
                  mappingAPILink: (
                    <EuiLink href={docsUrl} target="_blank" external>
                      {mappingAPILink}
                    </EuiLink>
                  ),
                }}
              />{' '}
            </p>
          </EuiText>
          {conflictedFields.length > 0 && (
            <>
              <EuiSpacer />
              <EuiCallOut title={mappingConflictHeader} color="warning" iconType="alert">
                <p>{mappingConflictLabel}</p>
              </EuiCallOut>
            </>
          )}
        </IndexHeader>
        <EuiSpacer />
        <Tabs
          indexPattern={indexPattern}
          saveIndexPattern={dataViews.updateSavedObject.bind(dataViews)}
          fields={fields}
          relationships={relationships}
          allowedTypes={allowedTypes}
          history={history}
          location={location}
          refreshFields={() => {
            setFields(indexPattern.getNonScriptedFields());
          }}
        />
      </div>
    );
  }
);
