/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import { getVegaEditorHelpAction, getVegaEditorOptionsAction } from './editor_menu_actions';

describe('Vega editor menu actions', () => {
  it.each([
    ['options', getVegaEditorOptionsAction, 'toggleOptions'],
    ['help', getVegaEditorHelpAction, 'toggleHelp'],
  ] as const)(
    'scopes the %s action to Vega and delegates to its session',
    async (_, factory, key) => {
      const action = factory();
      const callback = jest.fn();
      const editor = { type: VEGA_EMBEDDABLE_TYPE, [key]: callback };
      expect(await action.isCompatible?.({ editor })).toBe(true);
      expect(await action.isCompatible?.({ editor: { ...editor, type: 'other' } })).toBe(false);

      const anchor = document.createElement('button');
      await action.execute({ editor, anchor });
      expect(callback).toHaveBeenCalledWith(anchor);
    }
  );
});
