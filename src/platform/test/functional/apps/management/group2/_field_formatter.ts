/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NULL_PLACEHOLDER } from '@kbn/field-formats-common';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import expect from '@kbn/expect';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Migration recommendation: MIXED. About 55 generated edit/check test pairs mostly repeat Jest
 * coverage. Every converter, including null and blank inputs, is unit tested under
 * field_formats/common/converters/*.test.ts and public/lib/converters/date.test.ts. What is
 * really missing is at the Jest layer: the per-editor tests under data_view_field_editor/public/
 * components/field_format_editor/editors/ only render and never check that editing an input calls
 * onChange with the right params, and field_format_editor.tsx (the format selector, i.e. the
 * available formats per ES type) has no test. Scout should keep a small round trip (flyout → save
 * to data view → Discover doc viewer) for the three rendering paths only a browser proves: text
 * transform, link (`href`), and computed color styles. Keep the meta-unit default formatter check
 * too. Put it in field_formatter.spec.ts under data_view_management/test/scout/ui/tests, keep the
 * `test_field_formatters` role, and create the index and data view through the API. The rest is
 * MIGRATE TO JEST or DELETE as annotated per spec below.
 */
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings', 'common']);
  const testSubjects = getService('testSubjects');
  const security = getService('security');
  const es = getService('es');
  const indexPatterns = getService('indexPatterns');
  const toasts = getService('toasts');
  const retry = getService('retry');

  describe('field formatter', function () {
    this.tags(['skipFirefox']);

    before(async function () {
      await browser.setWindowSize(1200, 1200);
      await security.testUser.setRoles([
        'kibana_admin',
        'test_field_formatters',
        'test_logstash_reader',
      ]);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.uiSettings.replace({
        'data_views:cache_max_age': 0,
      });
    });

    after(async function afterAll() {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.uiSettings.replace({});
    });

    /**
     * Migration recommendation: MIGRATE TO JEST. Regression for #93349: switching from Duration to
     * Bytes crashed the editor (`nextProps.format.isHuman is not a function`) inside the
     * duration editor's getDerivedStateFromProps. That is component-local state and needs no
     * Elasticsearch or persistence. Add field_format_editor.test.tsx beside data_view_field_editor/
     * public/components/field_format_editor/field_format_editor.tsx that switches
     * duration → bytes → duration and asserts each editor renders without throwing.
     */
    describe('set and change field formatter', function describeIndexTests() {
      // addresses https://github.com/elastic/kibana/issues/93349
      it('can change format more than once', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        await PageObjects.settings.clickAddField();
        await PageObjects.settings.setFieldType('Long');
        const formatRow = await testSubjects.find('formatRow');
        const formatRowToggle = (
          await formatRow.findAllByCssSelector('[data-test-subj="toggle"]')
        )[0];

        await formatRowToggle.click();
        await PageObjects.settings.setFieldFormat('duration');
        await PageObjects.settings.setFieldFormat('bytes');
        await PageObjects.settings.setFieldFormat('duration');
        await PageObjects.settings.closeIndexPatternFieldEditor();
      });
    });

    /**
     * The purpose of these tests is to cover **editing experience** of different field formats editors,
     * The logic of each converter is extensively covered by unit tests.
     * TODO: these tests also could check field formats behaviour with different combinations of browser locale, timezone and ui settings
     */
    /**
     * Migration recommendation: MIXED (per spec below). The `expectFormatterTypes` checks, which
     * are the option lists offered for text, keyword, integer, long, double, date, date_nanos, and
     * boolean, belong in the new field_format_editor.test.tsx, rendered with a real
     * FieldFormatsRegistry. Specs that only feed null or blank values are DELETE, because each
     * converter test already asserts NULL_LABEL/EMPTY_LABEL for both text and React output.
     */
    describe('field format editors', () => {
      /**
       * Migration recommendation: MIXED. Keep keyword `upper` as the Scout text round trip. Move
       * transform and truncate editor interactions to Jest, and delete the null and blank specs.
       */
      describe('String format', () => {
        testFormatEditors([
          /**
           * Migration recommendation: MIGRATE TO JEST. Default string formatting of text is covered
           * by string.test.ts. The text option list it checks moves to field_format_editor.test.tsx.
           */
          {
            fieldType: ES_FIELD_TYPES.TEXT,
            fieldValue: 'A regular text',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'A regular text',

            // check available formats for ES_FIELD_TYPES.TEXT
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.TRUNCATE,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          /**
           * Migration recommendation: DELETE. The `(blank)` label is covered by string.test.ts
           * (EMPTY_LABEL). Its option list repeats the first spec.
           */
          {
            fieldType: ES_FIELD_TYPES.TEXT,
            fieldValue: '',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: '(blank)',

            // check available formats for ES_FIELD_TYPES.TEXT
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.TRUNCATE,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          /**
           * Migration recommendation: DELETE. The null placeholder is covered by string.test.ts
           * (NULL_LABEL). Its option list repeats the first spec.
           */
          {
            fieldType: ES_FIELD_TYPES.TEXT,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: NULL_PLACEHOLDER,

            // check available formats for ES_FIELD_TYPES.TEXT
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.TRUNCATE,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. Choosing `lower` in `stringEditorTransform`
           * should call onChange with `{ transform: 'lower' }`. Add that interaction to
           * editors/string/string.test.tsx, which today only renders. string.test.ts covers the
           * conversion.
           */
          {
            fieldType: ES_FIELD_TYPES.TEXT,
            fieldValue: 'A regular text',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'a regular text',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'lower');
            },
          },
          /**
           * Migration recommendation: MIGRATE TO SCOUT. Keep this as the text-format case of the
           * reduced round trip: the transform is picked in the flyout, saved to the data view, and
           * rendered in the Discover doc viewer. The keyword option list moves to
           * field_format_editor.test.tsx.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'a keyword',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'A KEYWORD',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'upper');
            },
            // check available formats for ES_FIELD_TYPES.KEYWORD
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.TRUNCATE,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. Add the `title` transform interaction to
           * string.test.tsx. string.test.ts covers title case.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'a keyword',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'A Keyword',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'title');
            },
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. Add the `short` transform interaction to
           * string.test.tsx. string.test.ts covers short dots.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'com.organizations.project.ClassName',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'c.o.p.ClassName',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'short');
            },
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. Add the `base64` transform interaction to
           * string.test.tsx. string.test.ts covers base64, including multi-byte input.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'SGVsbG8gd29ybGQ=',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'Hello world',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'base64');
            },
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. Add the `urlparam` transform interaction to
           * string.test.tsx. string.test.ts covers urlparam decoding.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: '%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: '안녕 키바나',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'urlparam');
            },
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. Typing into `truncateEditorLength` should
           * call onChange with `fieldLength`. Add that to editors/truncate/truncate.test.tsx.
           * truncate.test.ts covers the conversion.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: '123456789',
            applyFormatterType: FIELD_FORMAT_IDS.TRUNCATE,
            expectFormattedValue: '123...',
            beforeSave: async () => {
              await testSubjects.setValue('truncateEditorLength', '3');
            },
          },
          /**
           * Migration recommendation: DELETE. Blank handling with truncation is covered by
           * truncate.test.ts.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: '',
            applyFormatterType: FIELD_FORMAT_IDS.TRUNCATE,
            expectFormattedValue: '(blank)',
            beforeSave: async () => {
              await testSubjects.setValue('truncateEditorLength', '3');
            },
          },
          /**
           * Migration recommendation: DELETE. Null handling with truncation is covered by
           * truncate.test.ts.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.TRUNCATE,
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.setValue('truncateEditorLength', '3');
            },
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. Converting numbers with the string format is
           * covered by string.test.ts. The integer option list moves to
           * field_format_editor.test.tsx.
           */
          {
            fieldType: ES_FIELD_TYPES.INTEGER,
            fieldValue: 324,
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: '324',
            // check available formats for ES_FIELD_TYPES.INTEGER
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.BYTES,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.CURRENCY,
              FIELD_FORMAT_IDS.DURATION,
              FIELD_FORMAT_IDS.NUMBER,
              FIELD_FORMAT_IDS.PERCENT,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          /**
           * Migration recommendation: DELETE. The null placeholder is covered by string.test.ts. Its
           * option list repeats the previous spec.
           */
          {
            fieldType: ES_FIELD_TYPES.INTEGER,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: NULL_PLACEHOLDER,
            // check available formats for ES_FIELD_TYPES.INTEGER
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.BYTES,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.CURRENCY,
              FIELD_FORMAT_IDS.DURATION,
              FIELD_FORMAT_IDS.NUMBER,
              FIELD_FORMAT_IDS.PERCENT,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
          },
        ]);
      });

      /**
       * Migration recommendation: MIXED. Move the pattern editor interaction and the long option
       * list to Jest, and delete the null specs. Nothing here needs a browser.
       */
      describe('Number format', () => {
        testFormatEditors([
          /**
           * Migration recommendation: MIGRATE TO JEST. The default number format is
           * covered by number.test.ts. The long option list moves to field_format_editor.test.tsx.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 324,
            applyFormatterType: FIELD_FORMAT_IDS.NUMBER,
            expectFormattedValue: '324',
            // check available formats for ES_FIELD_TYPES.LONG
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.BYTES,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.CURRENCY,
              FIELD_FORMAT_IDS.DURATION,
              FIELD_FORMAT_IDS.NUMBER,
              FIELD_FORMAT_IDS.PERCENT,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          /**
           * Migration recommendation: DELETE. The null placeholder is covered by number.test.ts. Its
           * option list repeats the previous spec.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.NUMBER,
            expectFormattedValue: NULL_PLACEHOLDER,
            // check available formats for ES_FIELD_TYPES.LONG
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.BYTES,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.CURRENCY,
              FIELD_FORMAT_IDS.DURATION,
              FIELD_FORMAT_IDS.NUMBER,
              FIELD_FORMAT_IDS.PERCENT,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. Typing `+0,0` into
           * `numberEditorFormatPattern` should call onChange with that pattern. Add it to
           * editors/number/number.test.tsx. number.test.ts covers numeral patterns.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 324,
            applyFormatterType: FIELD_FORMAT_IDS.NUMBER,
            expectFormattedValue: '+324',
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '+0,0');
            },
          },
          /**
           * Migration recommendation: DELETE. Null with a custom pattern is covered by
           * number.test.ts.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.NUMBER,
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '+0,0');
            },
          },
        ]);
      });

      /**
       * Migration recommendation: MIXED. Keep URL template plus label as the Scout link round
       * trip, and delete the rest (url.test.ts covers them).
       */
      describe('URL format', () => {
        testFormatEditors([
          /**
           * Migration recommendation: DELETE. The spec with a URL template and a label template
           * below covers the same `urlEditorUrlTemplate` interaction and `href` check. url.test.ts
           * covers template interpolation.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 100,
            applyFormatterType: FIELD_FORMAT_IDS.URL,
            expectFormattedValue: 'https://elastic.co/?value=100',
            beforeSave: async () => {
              await testSubjects.setValue(
                'urlEditorUrlTemplate',
                'https://elastic.co/?value={{value}}'
              );
            },
            expect: async (renderedValueContainer) => {
              expect(
                await (await renderedValueContainer.findByTagName('a')).getAttribute('href')
              ).to.be('https://elastic.co/?value=100');
            },
          },
          /**
           * Migration recommendation: DELETE. url.test.ts covers null input rendering no anchor
           * (expectReactElementWithNull).
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.URL,
            expectFormattedValue: NULL_PLACEHOLDER,
            expect: async (renderedValueContainer) => {
              expect(await renderedValueContainer.findAllByTagName('a')).to.have.length(0);
            },
          },
          /**
           * Migration recommendation: DELETE. url.test.ts covers blank input rendering no anchor
           * (expectReactElementWithBlank).
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: '',
            applyFormatterType: FIELD_FORMAT_IDS.URL,
            expectFormattedValue: '(blank)',
            expect: async (renderedValueContainer) => {
              expect(await renderedValueContainer.findAllByTagName('a')).to.have.length(0);
            },
          },
          /**
           * Migration recommendation: DELETE. url.test.ts covers null input with a template.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.URL,
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.setValue(
                'urlEditorUrlTemplate',
                'https://elastic.co/?value={{value}}'
              );
            },
            expect: async (renderedValueContainer) => {
              expect(await renderedValueContainer.findAllByTagName('a')).to.have.length(0);
            },
          },
          /**
           * Migration recommendation: MIGRATE TO SCOUT. Keep this as the link case of the reduced
           * round trip. Both templates are edited in the flyout and saved, and the doc viewer must
           * render an anchor with the interpolated `href` and the label text. The url.test.tsx
           * render snapshots do not cover saving or Discover rendering.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 100,
            applyFormatterType: FIELD_FORMAT_IDS.URL,
            expectFormattedValue: 'url label',
            beforeSave: async () => {
              await testSubjects.setValue(
                'urlEditorUrlTemplate',
                'https://elastic.co/?value={{value}}'
              );
              await testSubjects.setValue('urlEditorLabelTemplate', 'url label');
            },
            expect: async (renderedValueContainer) => {
              expect(
                await (await renderedValueContainer.findByTagName('a')).getAttribute('href')
              ).to.be('https://elastic.co/?value=100');
            },
          },
          /**
           * Migration recommendation: DELETE. url.test.ts covers null input with URL and label
           * templates.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.URL,
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.setValue(
                'urlEditorUrlTemplate',
                'https://elastic.co/?value={{value}}'
              );
              await testSubjects.setValue('urlEditorLabelTemplate', 'url label');
            },
            expect: async (renderedValueContainer) => {
              expect(await renderedValueContainer.findAllByTagName('a')).to.have.length(0);
            },
          },
          /**
           * Migration recommendation: DELETE. url.test.ts covers blank input with URL and label
           * templates.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: '',
            applyFormatterType: FIELD_FORMAT_IDS.URL,
            expectFormattedValue: '(blank)',
            beforeSave: async () => {
              await testSubjects.setValue(
                'urlEditorUrlTemplate',
                'https://elastic.co/?value={{value}}'
              );
              await testSubjects.setValue('urlEditorLabelTemplate', 'url label');
            },
            expect: async (renderedValueContainer) => {
              expect(await renderedValueContainer.findAllByTagName('a')).to.have.length(0);
            },
          },
        ]);
      });

      /**
       * Migration recommendation: MIXED. Move the pattern editor interaction and the
       * date/date_nanos option lists to Jest, and delete the rest (date.test.ts and
       * date_nanos_shared.test.ts cover them).
       */
      describe('Date format', () => {
        testFormatEditors([
          /**
           * Migration recommendation: MIGRATE TO JEST. Typing into `dateEditorPattern` should call
           * onChange with the pattern. Add it to editors/date/date.test.tsx.
           * public/lib/converters/date.test.ts covers the conversion. The date option list moves to
           * field_format_editor.test.tsx.
           */
          {
            fieldType: ES_FIELD_TYPES.DATE,
            fieldValue: '2021-08-05T15:05:37.151Z',
            applyFormatterType: FIELD_FORMAT_IDS.DATE,
            expectFormattedValue: 'Aug 5, 2021',
            beforeSave: async () => {
              await testSubjects.setValue('dateEditorPattern', 'MMM D, YYYY');
            },
            // check available formats for ES_FIELD_TYPES.DATE
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.DATE,
              FIELD_FORMAT_IDS.DATE_NANOS,
              FIELD_FORMAT_IDS.RELATIVE_DATE,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          /**
           * Migration recommendation: DELETE. The null placeholder is covered by date.test.ts. Its
           * option list repeats the previous spec.
           */
          {
            fieldType: ES_FIELD_TYPES.DATE,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.DATE,
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.setValue('dateEditorPattern', 'MMM D, YYYY');
            },
            // check available formats for ES_FIELD_TYPES.DATE
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.DATE,
              FIELD_FORMAT_IDS.DATE_NANOS,
              FIELD_FORMAT_IDS.RELATIVE_DATE,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. The date_nanos option list
           * moves to field_format_editor.test.tsx. Millisecond formatting of a nanosecond value is
           * covered by date.test.ts.
           */
          {
            fieldType: ES_FIELD_TYPES.DATE_NANOS,
            fieldValue: '2015-01-01T12:10:30.123456789Z',
            applyFormatterType: FIELD_FORMAT_IDS.DATE,
            expectFormattedValue: 'Jan 1, 2015 @ 12:10:30.123',
            // check available formats for ES_FIELD_TYPES.DATE_NANOS
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.DATE,
              FIELD_FORMAT_IDS.DATE_NANOS,
              FIELD_FORMAT_IDS.RELATIVE_DATE,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          /**
           * Migration recommendation: DELETE. Nanosecond precision is covered by
           * date_nanos_shared.test.ts.
           */
          {
            fieldType: ES_FIELD_TYPES.DATE_NANOS,
            fieldValue: '2015-01-01T12:10:30.123456789Z',
            applyFormatterType: FIELD_FORMAT_IDS.DATE_NANOS,
            expectFormattedValue: 'Jan 1, 2015 @ 12:10:30.123456789',
          },
          /**
           * Migration recommendation: DELETE. The null placeholder is covered by
           * date_nanos_shared.test.ts.
           */
          {
            fieldType: ES_FIELD_TYPES.DATE_NANOS,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.DATE_NANOS,
            expectFormattedValue: NULL_PLACEHOLDER,
          },
        ]);
      });

      /**
       * Migration recommendation: MIXED. Move the lookup-table and unknown-value editor
       * interactions to Jest, and delete the rest (static_lookup.test.ts covers them, including
       * the `<script>` case).
       */
      describe('Static lookup format', () => {
        testFormatEditors([
          /**
           * Migration recommendation: MIGRATE TO JEST. Adding an entry and typing key and value in
           * the lookup table should call onChange with `lookupEntries`. Add that interaction to
           * editors/static_lookup/static_lookup.test.tsx, which today only renders.
           * static_lookup.test.ts covers the mapping.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'look me up',
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: 'looked up!',
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'look me up');
              await testSubjects.setValue('~staticLookupEditorValue', 'looked up!');
            },
          },
          /**
           * Migration recommendation: DELETE. static_lookup.test.ts covers null staying null ("null
           * stays null and shows null label").
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'look me up');
              await testSubjects.setValue('~staticLookupEditorValue', 'looked up!');
            },
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. Add the `staticLookupEditorUnknownValue`
           * interaction to static_lookup.test.tsx. The boolean option list moves to
           * field_format_editor.test.tsx. static_lookup.test.ts covers the mapping.
           */
          {
            fieldType: ES_FIELD_TYPES.BOOLEAN,
            fieldValue: 'true',
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            // check available formats for ES_FIELD_TYPES.BOOLEAN
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
            expectFormattedValue: 'yes',
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'true');
              await testSubjects.setValue('~staticLookupEditorValue', 'yes');
              await testSubjects.setValue('staticLookupEditorUnknownValue', 'no');
            },
          },
          /**
           * Migration recommendation: DELETE. static_lookup.test.ts covers the unknown-key fallback
           * ("maps unknown key to unknownKeyValue").
           */
          {
            fieldType: ES_FIELD_TYPES.BOOLEAN,
            fieldValue: 'false',
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: 'no',
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'true');
              await testSubjects.setValue('~staticLookupEditorValue', 'yes');
              await testSubjects.setValue('staticLookupEditorUnknownValue', 'no');
            },
          },
          /**
           * Migration recommendation: DELETE. static_lookup.test.ts covers returning the original
           * value when no unknownKeyValue is set.
           */
          {
            fieldType: ES_FIELD_TYPES.BOOLEAN,
            fieldValue: 'false',
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: 'false',
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'true');
              await testSubjects.setValue('~staticLookupEditorValue', 'yes');
            },
          },
          /**
           * Migration recommendation: DELETE. static_lookup.test.ts covers null input.
           */
          {
            fieldType: ES_FIELD_TYPES.BOOLEAN,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'true');
              await testSubjects.setValue('~staticLookupEditorValue', 'yes');
            },
          },
          /**
           * Migration recommendation: DELETE. static_lookup.test.ts covers mapping an empty-string
           * key.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: '',
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: 'Empty Value Mapped',
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', '');
              await testSubjects.setValue('~staticLookupEditorValue', 'Empty Value Mapped');
            },
          },
          /**
           * Migration recommendation: DELETE. static_lookup.test.ts covers null input with a custom
           * unknown value.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'some key');
              await testSubjects.setValue('~staticLookupEditorValue', 'some value');
              await testSubjects.setValue('staticLookupEditorUnknownValue', 'Custom Unknown');
            },
          },
          /**
           * Migration recommendation: DELETE. static_lookup.test.ts covers blank input with a custom
           * unknown value.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: '',
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: 'Custom Unknown',
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('staticLookupEditorUnknownValue', 'Custom Unknown');
            },
          },
          /**
           * Migration recommendation: DELETE. static_lookup.test.ts asserts that convertToText and
           * convertToReact return the `<script>` value as a plain string. The doc viewer renders it
           * through formatFieldValueReact (unified_doc_viewer doc_viewer_table/field_row.tsx), so
           * React escapes it and there is no HTML injection path to check end to end.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'html_test',
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: '<script>alert("test")</script>',
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'html_test');
              await testSubjects.setValue(
                '~staticLookupEditorValue',
                '<script>alert("test")</script>'
              );
            },
            expect: async (renderedValueContainer) => {
              // Verify no script element exists (XSS safety)
              const scripts = await renderedValueContainer.findAllByTagName('script');
              expect(scripts).to.have.length(0);
            },
          },
        ]);
      });

      /**
       * Migration recommendation: MIXED. Keep keyword color as the Scout styling round trip. Move
       * the duration, percent, and bytes editor interactions to Jest, and delete the rest.
       */
      describe('Other formats', () => {
        const checkColorPickerColor = async (picker: string, expectedColor: string) => {
          await retry.waitFor('color swatch to be updated', async () => {
            const pickerElement = await testSubjects.find(picker);
            const colorSwatchIcon = await testSubjects.findDescendant(
              'buttonColorSwatchIcon',
              pickerElement
            );
            const style = await colorSwatchIcon.getAttribute('style');
            return style?.includes(expectedColor) || false;
          });
        };

        const configureRedColor = async () => {
          await testSubjects.click('~colorEditorColorPicker');
          await testSubjects.setValue('~euiColorPickerInput_bottom', '#ffffff');
          await checkColorPickerColor('~colorEditorColorPicker', 'rgb(255, 255, 255)');
          await testSubjects.click('~colorEditorColorPicker');
          await testSubjects.click('~colorEditorBackgroundPicker');
          await testSubjects.setValue('~euiColorPickerInput_bottom', '#ff0000');
          await checkColorPickerColor('~colorEditorBackgroundPicker', 'rgb(255, 0, 0)');
          await testSubjects.click('~colorEditorBackgroundPicker');
        };

        testFormatEditors([
          /**
           * Migration recommendation: MIGRATE TO JEST. Selecting `milliseconds` in
           * `durationEditorInputFormat` should call onChange with `inputFormat`. Add it to
           * editors/duration/duration.test.tsx. duration.test.ts covers the humanized output.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 123292,
            applyFormatterType: FIELD_FORMAT_IDS.DURATION,
            expectFormattedValue: '2 minutes',
            beforeSave: async () => {
              await testSubjects.setValue('durationEditorInputFormat', 'milliseconds');
            },
          },
          /**
           * Migration recommendation: DELETE. The null placeholder is covered by duration.test.ts.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.DURATION,
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.setValue('durationEditorInputFormat', 'milliseconds');
            },
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. Add the `0.0%` pattern interaction to
           * editors/percent/percent.test.tsx. The double option list moves to
           * field_format_editor.test.tsx. percent.test.ts covers the conversion.
           */
          {
            fieldType: ES_FIELD_TYPES.DOUBLE,
            fieldValue: 0.1,
            applyFormatterType: FIELD_FORMAT_IDS.PERCENT,
            // check available formats for ES_FIELD_TYPES.DOUBLE
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.BYTES,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.CURRENCY,
              FIELD_FORMAT_IDS.DURATION,
              FIELD_FORMAT_IDS.NUMBER,
              FIELD_FORMAT_IDS.PERCENT,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
            expectFormattedValue: '10.0%',
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '0.0%');
            },
          },
          /**
           * Migration recommendation: DELETE. The null placeholder is covered by percent.test.ts.
           * Its option list repeats the previous spec.
           */
          {
            fieldType: ES_FIELD_TYPES.DOUBLE,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.PERCENT,
            // check available formats for ES_FIELD_TYPES.DOUBLE
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.BYTES,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.CURRENCY,
              FIELD_FORMAT_IDS.DURATION,
              FIELD_FORMAT_IDS.NUMBER,
              FIELD_FORMAT_IDS.PERCENT,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '0.0%');
            },
          },
          /**
           * Migration recommendation: MIGRATE TO JEST. Add the `0b` pattern interaction to
           * editors/bytes/bytes.test.tsx. bytes.test.ts covers the conversion.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 1990000000,
            applyFormatterType: FIELD_FORMAT_IDS.BYTES,
            expectFormattedValue: '2GB',
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '0b');
            },
          },
          /**
           * Migration recommendation: DELETE. The null placeholder is covered by bytes.test.ts.
           */
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.BYTES,
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '0b');
            },
          },
          /**
           * Migration recommendation: MIGRATE TO SCOUT. Keep this as the styling case of the reduced
           * round trip. Colors are set through the EUI color pickers, saved, and the doc viewer span
           * must get the computed text and background colors. Only a real browser can check computed
           * styles, and color.test.tsx only renders.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'red',
            applyFormatterType: FIELD_FORMAT_IDS.COLOR,
            expectFormattedValue: 'red',
            beforeSave: async () => {
              await testSubjects.click('colorEditorAddColor');
              await testSubjects.setValue('~colorEditorKeyPattern', 'red');
              await configureRedColor();
            },
            expect: async (renderedValueContainer) => {
              const span = await renderedValueContainer.findByTagName('span');
              expect(await span.getComputedStyle('color')).to.be('rgba(255, 255, 255, 1)');
              expect(await span.getComputedStyle('background-color')).to.be('rgba(255, 0, 0, 1)');
            },
          },
          /**
           * Migration recommendation: DELETE. color.test.ts covers null input getting no styling.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.COLOR,
            expectFormattedValue: NULL_PLACEHOLDER,
            beforeSave: async () => {
              await testSubjects.click('colorEditorAddColor');
              await testSubjects.setValue('~colorEditorKeyPattern', 'red');
              await configureRedColor();
            },
            expect: async (renderedValueContainer) => {
              const span = await renderedValueContainer.findByTagName('span');
              expect(await span.getComputedStyle('background-color')).to.be('rgba(0, 0, 0, 0)');
            },
          },
          /**
           * Migration recommendation: DELETE. color.test.ts covers blank input getting no styling.
           */
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: '',
            applyFormatterType: FIELD_FORMAT_IDS.COLOR,
            expectFormattedValue: '(blank)',
            beforeSave: async () => {
              await testSubjects.click('colorEditorAddColor');
              await testSubjects.setValue('~colorEditorKeyPattern', '');
              await configureRedColor();
            },
            expect: async (renderedValueContainer) => {
              const span = await renderedValueContainer.findByTagName('span');
              expect(await span.getComputedStyle('background-color')).to.be('rgba(0, 0, 0, 0)');
            },
          },
          /**
           * Migration recommendation: DELETE. color.test.ts covers boolean fields ("field is a
           * boolean"). The color picker interaction is already covered by the keyword color spec
           * above.
           */
          {
            fieldType: ES_FIELD_TYPES.BOOLEAN,
            fieldValue: true,
            applyFormatterType: FIELD_FORMAT_IDS.COLOR,
            expectFormattedValue: 'true',
            beforeSave: async () => {
              await configureRedColor();
            },
            expect: async (renderedValueContainer) => {
              const span = await renderedValueContainer.findByTagName('span');
              expect(await span.getComputedStyle('color')).to.be('rgba(255, 255, 255, 1)');
              expect(await span.getComputedStyle('background-color')).to.be('rgba(255, 0, 0, 1)');
            },
          },
          /**
           * Migration recommendation: DELETE. color.test.ts covers null input on boolean fields.
           */
          {
            fieldType: ES_FIELD_TYPES.BOOLEAN,
            fieldValue: null,
            applyFormatterType: FIELD_FORMAT_IDS.COLOR,
            expectFormattedValue: NULL_PLACEHOLDER,
            expect: async (renderedValueContainer) => {
              const span = await renderedValueContainer.findByTagName('span');
              expect(await span.getComputedStyle('background-color')).to.be('rgba(0, 0, 0, 0)');
            },
          },
        ]);
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. A `meta.unit: 's'` mapping must reach Discover as
     * a duration-formatted value (`20.57 min`). The pieces are tested separately:
     * field_caps_response.test.js checks that field caps set `defaultFormatter: 's'`, and
     * data_view.test.ts checks that a formatter is derived, but with a MockFieldFormatter. Nothing
     * checks mapping → metaUnitsToFormatter → rendered value from start to end. It is cheap,
     * because the index and data view are created through the API. Fold it into the same
     * field_formatter.spec.ts.
     */
    describe('default formatter by field meta value', () => {
      const indexTitle = 'field_formats_management_functional_tests';

      before(async () => {
        if (await es.indices.exists({ index: indexTitle })) {
          await es.indices.delete({ index: indexTitle });
        }
      });

      it('should apply default formatter by field meta value', async () => {
        await es.indices.create({
          index: indexTitle,
          mappings: {
            properties: {
              seconds: { type: 'long', meta: { unit: 's' } },
            },
          },
        });

        const docResult = await es.index({
          index: indexTitle,
          document: { seconds: 1234 },
          refresh: 'wait_for',
        });

        const testDocumentId = docResult._id;

        const indexPatternResult = await indexPatterns.create(
          { title: `${indexTitle}*` }, // sidesteps field caching when index pattern is reused
          { override: true }
        );

        await PageObjects.common.navigateToApp('discover', {
          hash: `/doc/${indexPatternResult.id}/${indexTitle}?id=${testDocumentId}`,
        });
        await testSubjects.exists('doc-hit');

        const renderedValue = await testSubjects.find(`tableDocViewRow-seconds-value`);
        const text = await renderedValue.getVisibleText();
        expect(text).to.be('20.57 min');
      });
    });
  });

  /**
   * Migration recommendation: the Scout replacement should not port this generator. Create one index
   * with just the three round-trip fields (keyword upper, long URL+label, keyword color) through
   * the API, set each format in the flyout, then check the doc viewer once. Replace the
   * `browser.execute` toggle click and the save-or-cancel `afterEach` with explicit, per-field
   * steps.
   *
   * Runs a field format editors tests covering data setup, editing a field and checking a resulting formatting in Discover app
   * TODO: might be useful to reuse this util for runtime fields formats tests
   * @param specs - {@link FieldFormatEditorSpecDescriptor}
   */
  function testFormatEditors(specs: FieldFormatEditorSpecDescriptor[]) {
    const indexTitle = 'field_formats_management_functional_tests';
    let indexPatternId: string;
    let testDocumentId: string;

    before(async () => {
      if (await es.indices.exists({ index: indexTitle })) {
        await es.indices.delete({ index: indexTitle });
        await kibanaServer.savedObjects.cleanStandardList();
      }

      await es.indices.create({
        index: indexTitle,
        mappings: {
          // @ts-expect-error Type 'Record<string, { type: ES_FIELD_TYPES; }>' is not assignable to type 'Record<string, MappingProperty>'.
          properties: specs.reduce(
            (properties, spec, index) => {
              properties[`${index}`] = { type: spec.fieldType };
              return properties;
            },
            {} as Record<string, { type: ES_FIELD_TYPES }>
          ),
        },
      });

      const docResult = await es.index({
        index: indexTitle,
        document: specs.reduce(
          (properties, spec, index) => {
            properties[`${index}`] = spec.fieldValue;
            return properties;
          },
          {} as Record<string, FieldFormatEditorSpecDescriptor['fieldValue']>
        ),
        refresh: 'wait_for',
      });
      testDocumentId = docResult._id;

      const indexPatternResult = await indexPatterns.create(
        { title: indexTitle },
        { override: true }
      );
      indexPatternId = indexPatternResult.id!;
    });

    describe('edit formats', () => {
      before(async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternByName(indexTitle);
        await PageObjects.settings.refreshDataViewFieldList();
      });

      afterEach(async () => {
        try {
          await PageObjects.settings.controlChangeSave();
        } catch (e) {
          // in case previous test failed in a state when save is disabled
          await PageObjects.settings.controlChangeCancel();
        }

        await toasts.dismissAll(); // dismiss "saved" toast, otherwise it could overlap save button for a next test
      });

      specs.forEach((spec, index) => {
        const fieldName = `${index}`;
        it(`edit field format of "${fieldName}" field to "${spec.applyFormatterType}"${
          spec.expectFormatterTypes ? ', and check available formats types' : ''
        }`, async () => {
          await PageObjects.settings.filterField(fieldName);
          await PageObjects.settings.openControlsByName(fieldName);
          await retry.try(async () => {
            await browser.execute(() => {
              const row = document.querySelector('[data-test-subj="formatRow"]');
              if (!row) throw new Error('formatRow not found');
              const toggle = row.querySelector('[data-test-subj="toggle"]') as HTMLElement;
              if (!toggle) throw new Error('Toggle not found in formatRow');
              toggle.click();
            });
          });

          if (spec.expectFormatterTypes) {
            expect(
              (
                await Promise.all(
                  (
                    await (
                      await testSubjects.find('editorSelectedFormatId')
                    ).findAllByTagName('option')
                  ).map((option) => option.getAttribute('value'))
                )
              ).filter(Boolean)
            ).to.eql(spec.expectFormatterTypes);
          }

          await PageObjects.settings.setFieldFormat(spec.applyFormatterType);
          if (spec.beforeSave) {
            await spec.beforeSave();
          }
        });
      });
    });

    describe('check formats', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('discover', {
          hash: `/doc/${indexPatternId}/${indexTitle}?id=${testDocumentId}`,
        });
        await testSubjects.exists('doc-hit');
      });

      specs.forEach((spec, index) => {
        it(`check field format of "${index}" field`, async () => {
          const renderedValue = await testSubjects.find(`tableDocViewRow-${index}-value`);
          await retry.try(async () => {
            const text = await renderedValue.getVisibleText();
            expect(text).to.be(spec.expectFormattedValue);
          });
          if (spec.expect) {
            const expectFn = spec.expect;
            await retry.try(async () => {
              await expectFn(renderedValue);
            });
          }
        });
      });
    });
  }
}

/**
 * Describes a field format editor test
 */
interface FieldFormatEditorSpecDescriptor {
  /**
   * Raw field value to put into document
   */
  fieldValue: string | number | boolean | null;
  /**
   * Explicitly specify a type for a {@link fieldValue}
   */
  fieldType: ES_FIELD_TYPES;
  /**
   * Type of a field formatter to apply
   */
  applyFormatterType: FIELD_FORMAT_IDS;

  /**
   * Optionally check available formats for {@link fieldType}
   */
  expectFormatterTypes?: FIELD_FORMAT_IDS[];

  /**
   * Function to execute before field format is applied.
   * Use it set specific configuration params for applied field formatter
   * @param formatRowContainer - field format editor container
   */
  beforeSave?: () => Promise<void>;

  /**
   * An expected formatted value rendered by Discover app,
   * Use this for final assertion
   */
  expectFormattedValue: string;

  /**
   * Run additional assertions on rendered element
   */
  expect?: (renderedValueContainer: WebElementWrapper) => Promise<void>;
}
