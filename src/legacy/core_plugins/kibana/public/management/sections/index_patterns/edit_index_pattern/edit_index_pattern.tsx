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
  EuiIcon,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { IndexPattern, IndexPatternField } from '../../../../../../../../plugins/data/public';
import {
  ChromeDocTitle,
  NotificationsStart,
  OverlayStart,
} from '../../../../../../../../core/public';
import { IndexPatternManagementStart } from '../../../../../../../../plugins/index_pattern_management/public';
import { Tabs } from './tabs';
import { IndexHeader } from './index_header';

interface EditIndexPatternProps extends RouteComponentProps {
  indexPattern: IndexPattern;
  indexPatterns: IndexPattern[];
  config: Record<string, any>;
  services: {
    notifications: NotificationsStart;
    docTitle: ChromeDocTitle;
    overlays: OverlayStart;
    indexPatternManagement: IndexPatternManagementStart;
  };
}

const mappingAPILink = i18n.translate(
  'kbn.management.editIndexPattern.timeFilterLabel.mappingAPILink',
  {
    defaultMessage: 'Mapping API',
  }
);

const mappingConflictHeader = i18n.translate(
  'kbn.management.editIndexPattern.mappingConflictHeader',
  {
    defaultMessage: 'Mapping conflict',
  }
);

const confirmMessage = i18n.translate('kbn.management.editIndexPattern.refreshLabel', {
  defaultMessage: 'This action resets the popularity counter of each field.',
});

const confirmModalOptionsRefresh = {
  confirmButtonText: i18n.translate('kbn.management.editIndexPattern.refreshButton', {
    defaultMessage: 'Refresh',
  }),
  title: i18n.translate('kbn.management.editIndexPattern.refreshHeader', {
    defaultMessage: 'Refresh field list?',
  }),
};

const confirmModalOptionsDelete = {
  confirmButtonText: i18n.translate('kbn.management.editIndexPattern.deleteButton', {
    defaultMessage: 'Delete',
  }),
  title: i18n.translate('kbn.management.editIndexPattern.deleteHeader', {
    defaultMessage: 'Delete index pattern?',
  }),
};

export const EditIndexPattern = withRouter(
  ({ indexPattern, indexPatterns, config, services, history, location }: EditIndexPatternProps) => {
    const [fields, setFields] = useState<IndexPatternField[]>(indexPattern.getNonScriptedFields());
    const [conflictedFields, setConflictedFields] = useState<IndexPatternField[]>(
      indexPattern.fields.filter(field => field.type === 'conflict')
    );
    const [defaultIndex, setDefaultIndex] = useState<string>(config.get('defaultIndex'));
    const [tags, setTags] = useState<any[]>([]);

    useEffect(() => {
      setFields(indexPattern.getNonScriptedFields());
      setConflictedFields(indexPattern.fields.filter(field => field.type === 'conflict'));
    }, [indexPattern, indexPattern.fields]);

    useEffect(() => {
      const indexPatternTags =
        services.indexPatternManagement.list.getIndexPatternTags(
          indexPattern,
          indexPattern.id === defaultIndex
        ) || [];
      setTags(indexPatternTags);
    }, [defaultIndex, indexPattern, services.indexPatternManagement.list]);

    const setDefaultPattern = useCallback(() => {
      config.set('defaultIndex', indexPattern.id);
      setDefaultIndex(indexPattern.id || '');
    }, [config, indexPattern.id]);

    const refreshFields = () => {
      services.overlays
        .openConfirm(confirmMessage, confirmModalOptionsRefresh)
        .then(async isConfirmed => {
          if (isConfirmed) {
            await indexPattern.init(true);
            setFields(indexPattern.getNonScriptedFields());
          }
        });
    };

    const removePattern = () => {
      function doRemove() {
        if (indexPattern.id === defaultIndex) {
          config.remove('defaultIndex');
          const otherPatterns = filter(indexPatterns, pattern => {
            return pattern.id !== indexPattern.id;
          });

          if (otherPatterns.length) {
            config.set('defaultIndex', otherPatterns[0].id);
          }
        }

        Promise.resolve(indexPattern.destroy()).then(function() {
          history.push('/management/kibana/index_patterns');
        });
      }

      services.overlays.openConfirm('', confirmModalOptionsDelete).then(isConfirmed => {
        if (isConfirmed) {
          doRemove();
        }
      });
    };

    const timeFilterHeader = i18n.translate('kbn.management.editIndexPattern.timeFilterHeader', {
      defaultMessage: "Time Filter field name: '{timeFieldName}'",
      values: { timeFieldName: indexPattern.timeFieldName },
    });

    const mappingConflictLabel = i18n.translate(
      'kbn.management.editIndexPattern.mappingConflictLabel',
      {
        defaultMessage:
          '{conflictFieldsLength, plural, one {A field is} other {# fields are}} defined as several types (string, integer, etc) across the indices that match this pattern. You may still be able to use these conflict fields in parts of Kibana, but they will be unavailable for functions that require Kibana to know their type. Correcting this issue will require reindexing your data.',
        values: { conflictFieldsLength: conflictedFields.length },
      }
    );

    services.docTitle.change(indexPattern.title);

    const showTagsSection = Boolean(indexPattern.timeFieldName || (tags && tags.length > 0));

    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <IndexHeader
            indexPattern={indexPattern}
            setDefault={setDefaultPattern}
            refreshFields={refreshFields}
            deleteIndexPattern={removePattern}
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
                id="kbn.management.editIndexPattern.timeFilterLabel.timeFilterDetail"
                defaultMessage="This page lists every field in the {indexPatternTitle} index and the field's associated core type as recorded by Elasticsearch. To change a field type, use the Elasticsearch"
                values={{ indexPatternTitle: <strong>{indexPattern.title}</strong> }}
              />{' '}
              <EuiLink
                href="http://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html"
                target="_blank"
              >
                {mappingAPILink}
                <EuiIcon type="link" />
              </EuiLink>
            </p>
          </EuiText>
          {conflictedFields.length > 0 && (
            <EuiCallOut title={mappingConflictHeader} color="warning" iconType="alert">
              <p>{mappingConflictLabel}</p>
            </EuiCallOut>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <Tabs
            indexPattern={indexPattern}
            fields={fields}
            config={config}
            services={{
              indexPatternManagement: services.indexPatternManagement,
            }}
            history={history}
            location={location}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
