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

import { bombIcon } from '../../components/svg/bomb_icon';
import { fireIcon } from '../../components/svg/fire_icon';

export const ICON_NAMES = {
  ASTERISK: 'fa-asterisk',
  BELL: 'fa-bell',
  BOLT: 'fa-bolt',
  BOMB: 'fa-bomb',
  BUG: 'fa-bug',
  COMMENT: 'fa-comment',
  EXCLAMATION_CIRCLE: 'fa-exclamation-circle',
  EXCLAMATION_TRIANGLE: 'fa-exclamation-triangle',
  FIRE: 'fa-fire',
  FLAG: 'fa-flag',
  HEART: 'fa-heart',
  MAP_MARKER: 'fa-map-marker',
  MAP_PIN: 'fa-map-pin',
  STAR: 'fa-star',
  TAG: 'fa-tag',
};

export const ICON_TYPES_MAP = {
  [ICON_NAMES.ASTERISK]: 'asterisk',
  [ICON_NAMES.BELL]: 'bell',
  [ICON_NAMES.BOLT]: 'bolt',
  [ICON_NAMES.BOMB]: bombIcon,
  [ICON_NAMES.BUG]: 'bug',
  [ICON_NAMES.COMMENT]: 'editorComment',
  [ICON_NAMES.EXCLAMATION_CIRCLE]: 'alert', // TODO: Change as an exclamation mark is added
  [ICON_NAMES.EXCLAMATION_TRIANGLE]: 'alert',
  [ICON_NAMES.FIRE]: fireIcon,
  [ICON_NAMES.FLAG]: 'flag',
  [ICON_NAMES.HEART]: 'heart',
  [ICON_NAMES.MAP_MARKER]: 'mapMarker',
  [ICON_NAMES.MAP_PIN]: 'pinFilled',
  [ICON_NAMES.STAR]: 'starFilled',
  [ICON_NAMES.TAG]: 'tag',
};
