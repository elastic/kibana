/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { Vis, VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';

import { DefaultEditorDataTab, DefaultEditorDataTabProps } from './data_tab';

export interface OptionTab {
  editor: React.ComponentType<VisEditorOptionsProps | DefaultEditorDataTabProps>;
  name: string;
  title: string;
  isSelected?: boolean;
}

export const useOptionTabs = ({ type: visType }: Vis): [OptionTab[], (name: string) => void] => {
  const [optionTabs, setOptionTabs] = useState<OptionTab[]>(() => {
    const tabs = [
      ...(visType.schemas.buckets?.length || visType.schemas.metrics?.length
        ? [
            {
              name: 'data',
              title: i18n.translate('visDefaultEditor.sidebar.tabs.dataLabel', {
                defaultMessage: 'Data',
              }),
              editor: DefaultEditorDataTab,
            },
          ]
        : []),

      ...(!visType.editorConfig.optionTabs && visType.editorConfig.optionsTemplate
        ? [
            {
              name: 'options',
              title: i18n.translate('visDefaultEditor.sidebar.tabs.optionsLabel', {
                defaultMessage: 'Options',
              }),
              editor: visType.editorConfig.optionsTemplate,
            },
          ]
        : visType.editorConfig.optionTabs),
    ];
    // set up the first tab as selected
    tabs[0].isSelected = true;

    return tabs;
  });

  const setSelectedTab = useCallback((name: string) => {
    setOptionTabs((tabs) => tabs.map((tab) => ({ ...tab, isSelected: tab.name === name })));
  }, []);

  return [optionTabs, setSelectedTab];
};
