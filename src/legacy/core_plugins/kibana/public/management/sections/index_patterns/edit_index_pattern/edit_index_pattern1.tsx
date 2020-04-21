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

import _ from 'lodash';
import React, { useEffect, useState, useCallback } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
// @ts-ignore
import { FieldEditor } from 'ui/field_editor';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiSpacer,
  EuiBadge,
  EuiText,
  EuiLink,
  EuiIcon,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexHeader } from './index_header';
import { IndexPattern, IndexPatternField } from '../../../../../../../../plugins/data/public';
import { ChromeDocTitle, NotificationsStart } from '../../../../../../../../core/public';

// @ts-ignore
import { getTabs } from './edit_sections';

interface EditIndexPatternProps extends RouteComponentProps {
  indexPattern: IndexPattern;
  mode?: string;
  fieldName?: string;
  fieldFormatEditors: any;
  config: Record<string, any>;
  services: {
    notifications: NotificationsStart;
    docTitle: ChromeDocTitle;
    indexPatternManagement: Record<string, any>;
    http: Function;
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

export const EditIndexPattern = withRouter(
  ({
    indexPattern,
    mode,
    fieldName,
    fieldFormatEditors,
    config,
    services,
    history,
  }: EditIndexPatternProps) => {
    const [fieldFilter, setFieldFilter] = useState<string>('');
    const [tabs, setTabs] = useState<EuiTabbedContentTab[]>(
      getTabs(indexPattern, fieldFilter, services.indexPatternManagement.list)
    );
    const [selectedTab, setSelectedTab] = useState<EuiTabbedContentTab>(tabs[0]);
    const [fields, setFields] = useState<IndexPatternField[]>(indexPattern.getNonScriptedFields());
    const [conflictedFields, setConflictedFields] = useState<IndexPatternField[]>(
      indexPattern.fields.filter(field => field.type === 'conflict')
    );
    indexPattern.tags =
      services.indexPatternManagement.list.getIndexPatternTags(
        indexPattern,
        indexPattern.id === config.get('defaultIndex')
      ) || [];

    const refreshFilters = useCallback(() => {
      const indexedFieldTypes = [];
      const scriptedFieldLanguages = [];
      indexPattern.fields.forEach(field => {
        if (field.scripted) {
          scriptedFieldLanguages.push(field.lang);
        } else {
          indexedFieldTypes.push(field.type);
        }
      });

      indexedFieldTypes = _.unique(indexedFieldTypes);
      scriptedFieldLanguages = _.unique(scriptedFieldLanguages);
    }, [indexPattern]);

    useEffect(() => {
      refreshFilters();
      setFields(indexPattern.getNonScriptedFields());
      setConflictedFields(indexPattern.fields.filter(field => field.type === 'conflict'));
    }, [indexPattern, refreshFilters]);

    const onTabClick = (tab: EuiTabbedContentTab) => {
      setSelectedTab(tab);
    };

    const timeFilterHeader = i18n.translate('kbn.management.editIndexPattern.timeFilterHeader', {
      defaultMessage: "Time Filter field name: '{timeFieldName}'",
      values: { timeFieldName: indexPattern.timeFieldName },
    });

    const timeFilterDetail = i18n.translate(
      'kbn.management.editIndexPattern.timeFilterLabel.timeFilterDetail',
      {
        defaultMessage:
          "This page lists every field in the {indexPatternTitle} index and the field's associated core type as recorded by Elasticsearch. To change a field type, use the Elasticsearch",
        values: { html_indexPatternTitle: '<strong>' + indexPattern.title + '</strong>' },
      }
    );

    const mappingConflictLabel = i18n.translate(
      'kbn.management.editIndexPattern.mappingConflictLabel',
      {
        defaultMessage:
          '{conflictFieldsLength, plural, one {A field is} other {# fields are}} defined as several types (string, integer, etc) across the indices that match this pattern. You may still be able to use these conflict fields in parts of Kibana, but they will be unavailable for functions that require Kibana to know their type. Correcting this issue will require reindexing your data.',
        values: { conflictFieldsLength: conflictedFields.length },
      }
    );

    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <IndexHeader indexPattern={indexPattern} defaultIndex={config.get('defaultIndex')} />
          <EuiSpacer size="s" />
          {indexPattern.timeFieldName ||
            (indexPattern.tags && indexPattern.tags.length && (
              <EuiFlexGroup wrap responsive={false} gutterSize="xs">
                {indexPattern.timeFieldName && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="warning">{timeFilterHeader}</EuiBadge>
                  </EuiFlexItem>
                )}
                {indexPattern.tags.map(tag => (
                  <EuiFlexItem grow={false} key={tag.id}>
                    <EuiBadge color="hollow">{tag.name}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ))}
          <EuiSpacer size="m" />
          <EuiText grow={false}>
            <p>
              {timeFilterDetail}
              <EuiLink
                href="http://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html"
                target="_blank"
              >
                {mappingAPILink}
                <EuiIcon type="link" />
              </EuiLink>
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          {conflictedFields.length && (
            <EuiCallOut title={mappingConflictHeader} color="warning" iconType="alert">
              <p>{mappingConflictLabel}</p>
            </EuiCallOut>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTabbedContent
            tabs={tabs}
            initialSelectedTab={selectedTab}
            autoFocus="selected"
            onTabClick={onTabClick}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
