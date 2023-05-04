/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { getAnnouncementsSettings } from './announcements';

describe('announcements settings', () => {
  const state = getAnnouncementsSettings();

  const getValidationFn = (setting: UiSettingsParams) => (value: any) =>
    setting.schema.validate(value);

  describe('hideAnnouncements', () => {
    const validate = getValidationFn(state.hideAnnouncements);

    it('should only accept boolean values', () => {
      expect(() => validate(true)).not.toThrow();
      expect(() => validate(false)).not.toThrow();
      expect(() => validate('foo')).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [boolean] but got [string]"`
      );
      expect(() => validate(12)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [boolean] but got [number]"`
      );
    });
  });
});
