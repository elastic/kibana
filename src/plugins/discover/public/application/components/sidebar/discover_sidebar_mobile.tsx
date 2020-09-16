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
import './discover_sidebar.scss';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { sortBy } from 'lodash';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { DiscoverField } from './discover_field';
import { DiscoverIndexPattern } from './discover_index_pattern';
import { DiscoverFieldSearch } from './discover_field_search';
import { IndexPatternAttributes } from '../../../../../data/common';
import { SavedObject } from '../../../../../../core/types';
import { FIELDS_LIMIT_SETTING } from '../../../../common';
import { groupFields } from './lib/group_fields';
import { IndexPatternField, IndexPattern, UI_SETTINGS } from '../../../../../data/public';
import { getDetails } from './lib/get_details';
import { getDefaultFieldFilter, setFieldFilterProp } from './lib/field_filter';
import { getIndexPatternFieldList } from './lib/get_index_pattern_field_list';
import { getServices } from '../../../kibana_services';

export interface DiscoverSidebarMobileProps {
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
  hits: Array<Record<string, unknown>>;
  /**
   * List of available index patterns
   */
  indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
  /**
   * Callback function when selecting a field
   */
  onAddField: (fieldName: string) => void;
  /**
   * Callback function when adding a filter from sidebar
   */
  onAddFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  /**
   * Callback function when removing a field
   * @param fieldName
   */
  onRemoveField: (fieldName: string) => void;
  /**
   * Currently selected index pattern
   */
  selectedIndexPattern: IndexPattern;
  /**
   * Callback function to select another index pattern
   */
  setIndexPattern: (id: string) => void;
}

export function DiscoverSidebarMobile({
  columns,
  fieldCounts,
  hits,
  indexPatternList,
  onAddField,
  onAddFilter,
  onRemoveField,
  selectedIndexPattern,
  setIndexPattern,
}: DiscoverSidebarMobileProps) {
  const [fields, setFields] = useState<IndexPatternField[] | null>(null);
  const [fieldFilterState, setFieldFilterState] = useState(getDefaultFieldFilter());
  const services = useMemo(() => getServices(), []);

  useEffect(() => {
    const newFields = getIndexPatternFieldList(selectedIndexPattern, fieldCounts);
    setFields(newFields);
  }, [selectedIndexPattern, fieldCounts, hits, services]);

  const onChangeFieldSearch = useCallback(
    (field: string, value: string | boolean | undefined) => {
      const newState = setFieldFilterProp(fieldFilterState, field, value);
      setFieldFilterState(newState);
    },
    [fieldFilterState]
  );

  const popularLimit = services.uiSettings.get(FIELDS_LIMIT_SETTING);

  const {
    selected: selectedFields,
    popular: popularFields,
    unpopular: unpopularFields,
  } = useMemo(() => groupFields(fields, columns, popularLimit, fieldCounts, fieldFilterState), [
    fields,
    columns,
    popularLimit,
    fieldCounts,
    fieldFilterState,
  ]);

  if (!selectedIndexPattern || !fields) {
    return null;
  }

  console.log(selectedFields, 'selectedFields');

  return (
    <I18nProvider>
      <section
        className="sidebar-list dscSidebar__section "
        aria-label={i18n.translate('discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel', {
          defaultMessage: 'Index and fields',
        })}
      >
        <div className="dscSidebar__sectionStatic">
          <DiscoverIndexPattern
            selectedIndexPattern={selectedIndexPattern}
            setIndexPattern={setIndexPattern}
            indexPatternList={sortBy(indexPatternList, (o) => o.attributes.title)}
          />
        </div>
      </section>
    </I18nProvider>
  );
}
