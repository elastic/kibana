/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/config-mocks';

import { config } from './i18n_config';

const deprecationContext = configDeprecationsMock.createContext();

const applyI18nDeprecations = (settings: Record<string, any> = {}) => {
  const deprecations = config.deprecations!(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const { config: migrated } = applyDeprecations(
    settings,
    deprecations.map((deprecation) => ({
      deprecation,
      path: 'i18n',
      context: deprecationContext,
    })),
    () =>
      ({ message }) => {
        deprecationMessages.push(message);
      }
  );
  return {
    messages: deprecationMessages,
    migrated,
  };
};

describe('i18n config', () => {
  describe('schema', () => {
    it('defaults to the five bundled locales and English defaultLocale', () => {
      const validated = config.schema.validate({});
      expect(validated).toEqual({
        locales: ['en', 'fr-FR', 'ja-JP', 'zh-CN', 'de-DE'],
        defaultLocale: 'en',
      });
    });

    it('accepts an explicit subset of locales when defaultLocale is in it', () => {
      const validated = config.schema.validate({
        locales: ['en', 'ja-JP'],
        defaultLocale: 'en',
      });
      expect(validated.locales).toEqual(['en', 'ja-JP']);
      expect(validated.defaultLocale).toEqual('en');
    });

    it('rejects defaultLocale not present in locales', () => {
      expect(() =>
        config.schema.validate({
          locales: ['en', 'fr-FR'],
          defaultLocale: 'ja-JP',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[i18n.defaultLocale]: \\"ja-JP\\" must be one of [i18n.locales] (en, fr-FR)"`
      );
    });

    it('skips the defaultLocale-must-be-in-locales check when locales is empty (picker disabled)', () => {
      const validated = config.schema.validate({ locales: [], defaultLocale: 'en' });
      expect(validated.locales).toEqual([]);
      expect(validated.defaultLocale).toEqual('en');
    });

    it('supports a maximum of 10 locales', () => {
      const validLocales = [
        'en',
        'fr-FR',
        'ja-JP',
        'zh-CN',
        'de-DE',
        'es-ES',
        'it-IT',
        'pt-PT',
        'ru-RU',
        'ko-KR',
      ];
      const validated = config.schema.validate({ locales: validLocales, defaultLocale: 'en' });
      expect(validated.locales).toEqual(validLocales);
      expect(validated.defaultLocale).toEqual('en');

      const tooManyLocales = [...validLocales, 'ar-AR'];
      expect(() =>
        config.schema.validate({ locales: tooManyLocales, defaultLocale: 'en' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[locales]: array size is [11], but cannot be greater than [10]"`
      );
    });
  });

  describe('deprecations', () => {
    it('renames the deprecated i18n.locale to i18n.defaultLocale', () => {
      const { migrated, messages } = applyI18nDeprecations({ i18n: { locale: 'ja-JP' } });

      expect(migrated.i18n).toEqual({ defaultLocale: 'ja-JP' });
      expect(messages).toEqual(
        expect.arrayContaining([expect.stringMatching(/i18n\.locale.*i18n\.defaultLocale/)])
      );
    });

    it('does not change config when i18n.locale is unset', () => {
      const { migrated, messages } = applyI18nDeprecations({ i18n: { defaultLocale: 'en' } });

      expect(migrated.i18n).toEqual({ defaultLocale: 'en' });
      expect(messages).toEqual([]);
    });
  });
});
