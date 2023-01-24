/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  [ICON_NAMES.EXCLAMATION_TRIANGLE]: 'alert',
  [ICON_NAMES.FIRE]: fireIcon,
  [ICON_NAMES.FLAG]: 'flag',
  [ICON_NAMES.HEART]: 'heart',
  [ICON_NAMES.MAP_MARKER]: 'mapMarker',
  [ICON_NAMES.MAP_PIN]: 'pinFilled',
  [ICON_NAMES.STAR]: 'starFilled',
  [ICON_NAMES.TAG]: 'tag',
};
