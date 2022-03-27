/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ThemeServiceStart, OverlayStart } from 'src/core/public';
import { createGetterSetter } from '../../kibana_utils/public';
import { IndexPatternsContract } from '../../data_views/public';

export const [getIndexPatterns, setIndexPatterns] =
  createGetterSetter<IndexPatternsContract>('IndexPatterns');

export const [getTheme, setTheme] = createGetterSetter<ThemeServiceStart>('Theme');

export const [getOverlays, setOverlays] = createGetterSetter<OverlayStart>('Overlays');
