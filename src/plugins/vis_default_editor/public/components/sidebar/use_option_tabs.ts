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

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { Vis } from '../../../../visualizations/public';

import { VisOptionsProps } from '../../vis_options_props';
import { DefaultEditorDataTab, DefaultEditorDataTabProps } from './data_tab';

export interface OptionTab {
  editor: React.ComponentType<VisOptionsProps | DefaultEditorDataTabProps>;
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
