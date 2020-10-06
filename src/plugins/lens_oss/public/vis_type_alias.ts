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

import { i18n } from '@kbn/i18n';
import { VisTypeAlias } from 'src/plugins/visualizations/public';

export const getLensAliasConfig = (): VisTypeAlias => ({
  aliasPath: '#/',
  aliasApp: 'lens',
  name: 'lensOss',
  title: i18n.translate('lensOss.visTypeAlias.title', {
    defaultMessage: 'Lens',
  }),
  description: i18n.translate('lensOss.visTypeAlias.description', {
    defaultMessage: `Drag and drop intuitive way to create multiple types of visualizations. Best option for most visualizations.`,
  }),
  icon: 'lensApp',
  stage: 'production',
  disabled: true,
});
