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
import { Positions, Rotates } from '../../utils/collections';

function mapPositionOpposite(position: Positions) {
  switch (position) {
    case 'bottom':
      return Positions.TOP;
    case 'top':
      return Positions.BOTTOM;
    case 'left':
      return Positions.RIGHT;
    case 'right':
      return Positions.LEFT;
    default:
      throw new Error('Invalid legend position.');
  }
}

function mapPosition(position: Positions) {
  switch (position) {
    case Positions.BOTTOM:
      return Positions.LEFT;
    case Positions.TOP:
      return Positions.RIGHT;
    case Positions.LEFT:
      return Positions.BOTTOM;
    case Positions.RIGHT:
      return Positions.TOP;
  }
}

const rotateOptions = [
  {
    text: i18n.translate('kbnVislibVisTypes.categoryAxis.rotate.horizontalText', {
      defaultMessage: 'Horizontal',
    }),
    value: Rotates.HORIZONTAL,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.categoryAxis.rotate.verticalText', {
      defaultMessage: 'Vertical',
    }),
    value: Rotates.VERTICAL,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.categoryAxis.rotate.angledText', {
      defaultMessage: 'Angled',
    }),
    value: Rotates.ANGLED,
  },
];

export { mapPositionOpposite, mapPosition, rotateOptions };
