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

import Slugify from '../string/slugify';

import BarExample from '../../views/bar/bar_example';

import ButtonExample from '../../views/button/button_example';

import CollapseButtonExample from '../../views/collapse_button/collapse_button_example';

import FormExample from '../../views/form/form_example';

import FormLayoutExample from '../../views/form_layout/form_layout_example';

import IconExample from '../../views/icon/icon_example';

import InfoPanelExample from '../../views/info_panel/info_panel_example';

import LinkExample from '../../views/link/link_example';

import LocalNavExample from '../../views/local_nav/local_nav_example';

import PagerExample from '../../views/pager/pager_example';

import PanelExample from '../../views/panel/panel_example';

import EmptyTablePromptExample from '../../views/empty_table_prompt/empty_table_prompt_example';

import StatusTextExample from '../../views/status_text/status_text_example';

import TableExample from '../../views/table/table_example';

import TabsExample from '../../views/tabs/tabs_example';

import ToolBarExample from '../../views/tool_bar/tool_bar_example';

import TypographyExample from '../../views/typography/typography_example';

import VerticalRhythmExample from '../../views/vertical_rhythm/vertical_rhythm_example';

import ViewSandbox from '../../views/view/view_sandbox';

// Component route names should match the component name exactly.
const components = [
  {
    name: 'Bar',
    component: BarExample,
    hasReact: true,
  },
  {
    name: 'Button',
    component: ButtonExample,
    hasReact: true,
  },
  {
    name: 'CollapseButton',
    component: CollapseButtonExample,
    hasReact: true,
  },
  {
    name: 'EmptyTablePrompt',
    component: EmptyTablePromptExample,
    hasReact: true,
  },
  {
    name: 'Form',
    component: FormExample,
  },
  {
    name: 'FormLayout',
    component: FormLayoutExample,
    hasReact: true,
  },
  {
    name: 'Icon',
    component: IconExample,
  },
  {
    name: 'InfoPanel',
    component: InfoPanelExample,
  },
  {
    name: 'Link',
    component: LinkExample,
  },
  {
    name: 'LocalNav',
    component: LocalNavExample,
    hasReact: true,
  },
  {
    name: 'Pager',
    component: PagerExample,
    hasReact: true,
  },
  {
    name: 'Panel',
    component: PanelExample,
  },
  {
    name: 'StatusText',
    component: StatusTextExample,
  },
  {
    name: 'Table',
    component: TableExample,
    hasReact: true,
  },
  {
    name: 'Tabs',
    component: TabsExample,
    hasReact: true,
  },
  {
    name: 'ToolBar',
    component: ToolBarExample,
    hasReact: true,
  },
  {
    name: 'Typography',
    component: TypographyExample,
  },
  {
    name: 'VerticalRhythm',
    component: VerticalRhythmExample,
  },
];

const sandboxes = [
  {
    name: 'View',
    component: ViewSandbox,
  },
];

const allRoutes = components.concat(sandboxes);

export default {
  components: Slugify.each(components, 'name', 'path'),
  sandboxes: Slugify.each(sandboxes, 'name', 'path'),
  getAppRoutes: function getAppRoutes() {
    return allRoutes;
  },
  getPreviousRoute: function getPreviousRoute(routeName) {
    const index = allRoutes.findIndex(item => {
      return item.name === routeName;
    });

    return index >= 0 ? allRoutes[index - 1] : undefined;
  },
  getNextRoute: function getNextRoute(routeName) {
    const index = allRoutes.findIndex(item => {
      return item.name === routeName;
    });

    return index < allRoutes.length - 1 ? allRoutes[index + 1] : undefined;
  },
};
