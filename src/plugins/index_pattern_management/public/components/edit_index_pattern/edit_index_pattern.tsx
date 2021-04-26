/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { filter } from 'lodash';
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
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ResolvedIndexPattern, IndexPatternField } from '../../../../../plugins/data/public';
import { useKibana } from '../../../../../plugins/kibana_react/public';
import { IPM_APP_ID } from '../../constants';
import { IndexPatternManagmentContext } from '../../types';
import { Tabs } from './tabs';
import { IndexHeader } from './index_header';

export interface EditIndexPatternProps extends RouteComponentProps {
  resolvedIndexPattern: ResolvedIndexPattern;
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

const confirmModalOptionsDelete = {
  confirmButtonText: i18n.translate('indexPatternManagement.editIndexPattern.deleteButton', {
    defaultMessage: 'Delete',
  }),
  title: i18n.translate('indexPatternManagement.editIndexPattern.deleteHeader', {
    defaultMessage: 'Delete index pattern?',
  }),
};

export const EditIndexPattern = withRouter(
  ({ resolvedIndexPattern, history, location }: EditIndexPatternProps) => {
    const { indexPattern } = resolvedIndexPattern;
    const {
      uiSettings,
      indexPatternManagementStart,
      overlays,
      chrome,
      http,
      data,
      spacesOss,
    } = useKibana<IndexPatternManagmentContext>().services;
    const { basePath } = http;
    const [fields, setFields] = useState<IndexPatternField[]>(indexPattern.getNonScriptedFields());
    const [conflictedFields, setConflictedFields] = useState<IndexPatternField[]>(
      indexPattern.fields.getAll().filter((field) => field.type === 'conflict')
    );
    const [defaultIndex, setDefaultIndex] = useState<string>(uiSettings.get('defaultIndex'));
    const [tags, setTags] = useState<any[]>([]);

    useEffect(() => {
      setFields(indexPattern.getNonScriptedFields());
      setConflictedFields(
        indexPattern.fields.getAll().filter((field) => field.type === 'conflict')
      );
    }, [indexPattern]);

    useEffect(() => {
      const indexPatternTags =
        indexPatternManagementStart.list.getIndexPatternTags(
          indexPattern,
          indexPattern.id === defaultIndex
        ) || [];
      setTags(indexPatternTags);
    }, [defaultIndex, indexPattern, indexPatternManagementStart.list]);

    const setDefaultPattern = useCallback(() => {
      uiSettings.set('defaultIndex', indexPattern.id);
      setDefaultIndex(indexPattern.id || '');
    }, [uiSettings, indexPattern.id]);

    const removePattern = () => {
      async function doRemove() {
        if (indexPattern.id === defaultIndex) {
          const indexPatterns = await data.indexPatterns.getIdsWithTitle();
          uiSettings.remove('defaultIndex');
          const otherPatterns = filter(indexPatterns, (pattern) => {
            return pattern.id !== indexPattern.id;
          });

          if (otherPatterns.length) {
            uiSettings.set('defaultIndex', otherPatterns[0].id);
          }
        }
        if (indexPattern.id) {
          Promise.resolve(data.indexPatterns.delete(indexPattern.id)).then(function () {
            history.push('');
          });
        }
      }

      overlays.openConfirm('', confirmModalOptionsDelete).then((isConfirmed) => {
        if (isConfirmed) {
          doRemove();
        }
      });
    };

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

    const headingAriaLabel = i18n.translate('indexPatternManagement.editIndexPattern.detailsAria', {
      defaultMessage: 'Index pattern details',
    });

    chrome.docTitle.change(indexPattern.title);

    const showTagsSection = Boolean(indexPattern.timeFieldName || (tags && tags.length > 0));
    const kibana = useKibana();
    const docsUrl = kibana.services.docLinks!.links.elasticsearch.mapping;

    useEffect(() => {
      if (resolvedIndexPattern.outcome === 'aliasMatch' && spacesOss.isSpacesAvailable) {
        // This index pattern has been resolved from a legacy URL, we should redirect the user to the new URL and display a toast.
        const path = basePath.prepend(
          `kibana/${IPM_APP_ID}/patterns/${indexPattern.id}${window.location.hash}`
        );
        const objectNoun = 'index pattern'; // TODO: i18n
        spacesOss.ui.redirectLegacyUrl(path, objectNoun);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getLegacyUrlConflictCallout = () => {
      if (
        resolvedIndexPattern.outcome === 'conflict' &&
        resolvedIndexPattern.aliasTargetId &&
        spacesOss.isSpacesAvailable
      ) {
        // We have resolved to one index pattern, but there is another one with a legacy URL associated with this page. We should display a
        // callout with a warning for the user, and provide a way for them to navigate to the other index pattern.
        const otherObjectId = resolvedIndexPattern.aliasTargetId;
        const otherObjectPath = basePath.prepend(
          `kibana/${IPM_APP_ID}/patterns/${otherObjectId}${window.location.hash}`
        );
        return (
          <>
            <EuiSpacer />
            {spacesOss.ui.components.getLegacyUrlConflict({
              objectNoun: 'index pattern', // TODO: i18n
              currentObjectId: indexPattern.id!,
              otherObjectId,
              otherObjectPath,
            })}
          </>
        );
      }
      return null;
    };

    return (
      <EuiPanel paddingSize={'l'}>
        <div data-test-subj="editIndexPattern" role="region" aria-label={headingAriaLabel}>
          <IndexHeader
            indexPattern={indexPattern}
            setDefault={setDefaultPattern}
            deleteIndexPatternClick={removePattern}
            defaultIndex={defaultIndex}
          />
          <EuiSpacer size="s" />
          {showTagsSection && (
            <EuiFlexGroup wrap>
              {Boolean(indexPattern.timeFieldName) && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">{timeFilterHeader}</EuiBadge>
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
          {getLegacyUrlConflictCallout()}
          {conflictedFields.length > 0 && (
            <>
              <EuiSpacer />
              <EuiCallOut title={mappingConflictHeader} color="warning" iconType="alert">
                <p>{mappingConflictLabel}</p>
              </EuiCallOut>
            </>
          )}
          <EuiSpacer />
          <Tabs
            indexPattern={indexPattern}
            saveIndexPattern={data.indexPatterns.updateSavedObject.bind(data.indexPatterns)}
            fields={fields}
            history={history}
            location={location}
            refreshFields={() => {
              setFields(indexPattern.getNonScriptedFields());
            }}
          />
        </div>
      </EuiPanel>
    );
  }
);
