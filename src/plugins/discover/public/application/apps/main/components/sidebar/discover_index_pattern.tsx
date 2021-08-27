/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { I18nProvider } from '@kbn/i18n/react';
import React, { useEffect, useState } from 'react';
import type { SavedObject } from '../../../../../../../../core/types/saved_objects';
import { IndexPattern } from '../../../../../../../data/common/index_patterns/index_patterns/index_pattern';
import type { IndexPatternAttributes } from '../../../../../../../data/common/index_patterns/types';
import { ChangeIndexPattern } from './change_indexpattern';
import type { IndexPatternRef } from './types';

export interface DiscoverIndexPatternProps {
  /**
   * list of available index patterns, if length > 1, component offers a "change" link
   */
  indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
  /**
   * Callback function when changing an index pattern
   */
  onChangeIndexPattern: (id: string) => void;
  /**
   * currently selected index pattern, due to angular issues it's undefined at first rendering
   */
  selectedIndexPattern: IndexPattern;
}

/**
 * Component allows you to select an index pattern in discovers side bar
 */
export function DiscoverIndexPattern({
  indexPatternList,
  onChangeIndexPattern,
  selectedIndexPattern,
}: DiscoverIndexPatternProps) {
  const options: IndexPatternRef[] = (indexPatternList || []).map((entity) => ({
    id: entity.id,
    title: entity.attributes!.title,
  }));
  const { id: selectedId, title: selectedTitle } = selectedIndexPattern || {};

  const [selected, setSelected] = useState({
    id: selectedId,
    title: selectedTitle || '',
  });
  useEffect(() => {
    const { id, title } = selectedIndexPattern;
    setSelected({ id, title });
  }, [selectedIndexPattern]);
  if (!selectedId) {
    return null;
  }

  return (
    <I18nProvider>
      <ChangeIndexPattern
        trigger={{
          label: selected.title,
          title: selected.title,
          'data-test-subj': 'indexPattern-switch-link',
        }}
        indexPatternId={selected.id}
        indexPatternRefs={options}
        onChangeIndexPattern={(id) => {
          const indexPattern = options.find((pattern) => pattern.id === id);
          if (indexPattern) {
            onChangeIndexPattern(id);
            setSelected(indexPattern);
          }
        }}
      />
    </I18nProvider>
  );
}
