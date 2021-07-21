/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act } from 'react-dom/test-utils';

import type { Props } from '../../public/components/field_editor_flyout_content';
import { setupEnvironment, spySearchResult, fieldFormatsOptions } from './helpers';
import {
  setup,
  setIndexPatternFields,
  FieldEditorFlyoutContentTestBed,
} from './field_editor_flyout_content.helpers';
import { createPreviewError } from './helpers/mocks';

describe('<FieldEditorFlyoutContent />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['foo'] });
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  test('should have the correct title', async () => {
    const { exists, find } = await setup();
    expect(exists('flyoutTitle')).toBe(true);
    expect(find('flyoutTitle').text()).toBe('Create field');
  });

  test('should allow a field to be provided', async () => {
    const field = {
      name: 'foo',
      type: 'ip',
      script: {
        source: 'emit("hello world")',
      },
    };

    const { find } = await setup({ field });

    expect(find('flyoutTitle').text()).toBe(`Edit field 'foo'`);
    expect(find('nameField.input').props().value).toBe(field.name);
    expect(find('typeField').props().value).toBe(field.type);
    expect(find('scriptField').props().value).toBe(field.script.source);
  });

  test('should accept an "onSave" prop', async () => {
    const field = {
      name: 'foo',
      type: 'date',
      script: { source: 'test=123' },
    };
    const onSave: jest.Mock<Props['onSave']> = jest.fn();

    const { find } = await setup({ onSave, field });

    await act(async () => {
      find('fieldSaveButton').simulate('click');
    });

    await act(async () => {
      // The painless syntax validation has a timeout set to 600ms
      // we give it a bit more time just to be on the safe side
      jest.advanceTimersByTime(1000);
    });

    expect(onSave).toHaveBeenCalled();
    const fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];
    expect(fieldReturned).toEqual(field);
  });

  test('should accept an onCancel prop', async () => {
    const onCancel = jest.fn();
    const { find } = await setup({ onCancel });

    find('closeFlyoutButton').simulate('click');

    expect(onCancel).toHaveBeenCalled();
  });

  describe('validation', () => {
    test('should validate the fields and prevent saving invalid form', async () => {
      const onSave: jest.Mock<Props['onSave']> = jest.fn();

      const { find, exists, form, component } = await setup({ onSave });

      expect(find('fieldSaveButton').props().disabled).toBe(false);

      await act(async () => {
        find('fieldSaveButton').simulate('click');
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      component.update();

      expect(onSave).toHaveBeenCalledTimes(0);
      expect(find('fieldSaveButton').props().disabled).toBe(true);
      expect(form.getErrorsMessages()).toEqual(['A name is required.']);
      expect(exists('formError')).toBe(true);
      expect(find('formError').text()).toBe('Fix errors in form before continuing.');
    });

    test('should forward values from the form', async () => {
      const onSave: jest.Mock<Props['onSave']> = jest.fn();

      const {
        find,
        actions: { toggleFormRow, fields },
      } = await setup({ onSave });

      await fields.updateName('someName');
      await toggleFormRow('value');
      await fields.updateScript('echo("hello")');

      await act(async () => {
        // Let's make sure that validation has finished running
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        find('fieldSaveButton').simulate('click');
      });

      expect(onSave).toHaveBeenCalled();

      let fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];

      expect(fieldReturned).toEqual({
        name: 'someName',
        type: 'keyword', // default to keyword
        script: { source: 'echo("hello")' },
      });

      // Change the type and make sure it is forwarded
      await fields.updateType('other_type', 'Other type');

      await act(async () => {
        find('fieldSaveButton').simulate('click');
      });

      fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];

      expect(fieldReturned).toEqual({
        name: 'someName',
        type: 'other_type',
        script: { source: 'echo("hello")' },
      });
    });
  });

  describe('preview panel', () => {
    let testBed: FieldEditorFlyoutContentTestBed;

    interface TestDoc {
      title: string;
      subTitle: string;
      description: string;
    }

    const mockDocuments: Array<{ _id: string; _index: string; _source: TestDoc }> = [
      {
        _id: '001',
        _index: 'testIndex',
        _source: {
          title: 'First doc - title',
          subTitle: 'First doc - subTitle',
          description: 'First doc - description',
        },
      },
      {
        _id: '002',
        _index: 'testIndex',
        _source: {
          title: 'Second doc - title',
          subTitle: 'Second doc - subTitle',
          description: 'Second doc - description',
        },
      },
      {
        _id: '003',
        _index: 'testIndex',
        _source: {
          title: 'Third doc - title',
          subTitle: 'Third doc - subTitle',
          description: 'Third doc - description',
        },
      },
    ];

    const [doc1, doc2, doc3] = mockDocuments;

    const indexPatternFields: Array<{ name: string; displayName: string }> = [
      {
        name: 'title',
        displayName: 'title',
      },
      {
        name: 'subTitle',
        displayName: 'subTitle',
      },
      {
        name: 'description',
        displayName: 'description',
      },
    ];

    beforeEach(async () => {
      setIndexPatternFields(indexPatternFields);

      spySearchResult.mockResolvedValue({
        rawResponse: {
          hits: {
            total: mockDocuments.length,
            hits: mockDocuments,
          },
        },
      });

      testBed = await setup();
    });

    test('should display the preview panel when either "set value" or "set format" is activated', async () => {
      const {
        exists,
        actions: { toggleFormRow },
      } = testBed;

      expect(exists('previewPanel')).toBe(false);

      await toggleFormRow('value');
      expect(exists('previewPanel')).toBe(true);

      await toggleFormRow('value', 'off');
      expect(exists('previewPanel')).toBe(false);

      await toggleFormRow('format');
      expect(exists('previewPanel')).toBe(true);

      await toggleFormRow('format', 'off');
      expect(exists('previewPanel')).toBe(false);
    });

    test('should display an empty prompt if no name and no script are defined', async () => {
      const {
        exists,
        actions: { toggleFormRow, fields, waitForPreviewUpdate },
      } = testBed;

      await toggleFormRow('value');
      expect(exists('previewPanel')).toBe(true);
      expect(exists('previewPanel.emptyPrompt')).toBe(true);

      await fields.updateName('someName');
      await waitForPreviewUpdate();
      expect(exists('previewPanel.emptyPrompt')).toBe(false);

      await fields.updateName(' ');
      await waitForPreviewUpdate();
      expect(exists('previewPanel.emptyPrompt')).toBe(true);

      // The name is empty and the empty prompt is displayed, let's now add a script...
      await fields.updateScript('echo("hello")');
      await waitForPreviewUpdate();
      expect(exists('previewPanel.emptyPrompt')).toBe(false);

      await fields.updateScript(' ');
      await waitForPreviewUpdate();
      expect(exists('previewPanel.emptyPrompt')).toBe(true);
    });

    test('should list the list of fields of the index pattern', async () => {
      const {
        actions: { toggleFormRow, fields, getRenderedIndexPatternFields },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');

      expect(getRenderedIndexPatternFields()).toEqual([
        {
          key: 'title',
          value: mockDocuments[0]._source.title,
        },
        {
          key: 'subTitle',
          value: mockDocuments[0]._source.subTitle,
        },
        {
          key: 'description',
          value: mockDocuments[0]._source.description,
        },
      ]);
    });

    test('should filter down the field in the list', async () => {
      const {
        exists,
        find,
        component,
        actions: { toggleFormRow, fields, setFilterFieldsValue, getRenderedIndexPatternFields },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');

      // Should find a single field
      await setFilterFieldsValue('descr');
      expect(getRenderedIndexPatternFields()).toEqual([
        { key: 'description', value: 'First doc - description' },
      ]);

      // Should be case insensitive
      await setFilterFieldsValue('title');
      expect(exists('emptySearchResult')).toBe(false);
      expect(getRenderedIndexPatternFields()).toEqual([
        { key: 'title', value: 'First doc - title' },
        { key: 'subTitle', value: 'First doc - subTitle' },
      ]);

      // Should display an empty search result with a button to clear
      await setFilterFieldsValue('doesNotExist');
      expect(exists('emptySearchResult')).toBe(true);
      expect(getRenderedIndexPatternFields()).toEqual([]);
      expect(exists('emptySearchResult.clearSearchButton'));

      find('emptySearchResult.clearSearchButton').simulate('click');
      component.update();
      expect(getRenderedIndexPatternFields()).toEqual([
        {
          key: 'title',
          value: mockDocuments[0]._source.title,
        },
        {
          key: 'subTitle',
          value: mockDocuments[0]._source.subTitle,
        },
        {
          key: 'description',
          value: mockDocuments[0]._source.description,
        },
      ]);
    });

    test('should pin the field to the top of the list', async () => {
      const {
        find,
        component,
        actions: {
          toggleFormRow,
          fields,
          getWrapperRenderedIndexPatternFields,
          getRenderedIndexPatternFields,
        },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');

      const fieldsRendered = getWrapperRenderedIndexPatternFields();

      if (fieldsRendered === null) {
        throw new Error('No index pattern field rendered.');
      }

      expect(fieldsRendered.length).toBe(Object.keys(doc1._source).length);
      // make sure that the last one if the "description" field
      expect(fieldsRendered.at(2).text()).toBe('descriptionFirst doc - description');

      // Click the third field in the list ("description")
      const descriptionField = fieldsRendered.at(2);
      find('pinFieldButton', descriptionField).simulate('click');
      component.update();

      expect(getRenderedIndexPatternFields()).toEqual([
        { key: 'description', value: 'First doc - description' }, // Pinned!
        { key: 'title', value: 'First doc - title' },
        { key: 'subTitle', value: 'First doc - subTitle' },
      ]);
    });

    describe('key & value', () => {
      test('should set an empty value when no script is provided', async () => {
        const {
          actions: { toggleFormRow, fields, getRenderedFieldsPreview },
        } = testBed;

        await toggleFormRow('value');
        await fields.updateName('myRuntimeField');

        expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: '-' }]);
      });

      describe('read from _source', () => {
        test('should display the _source value when no script is provided and the name matched one of the fields in _source', async () => {
          const {
            actions: { toggleFormRow, fields, getRenderedFieldsPreview },
          } = testBed;

          await toggleFormRow('value');
          await fields.updateName('subTitle');

          expect(getRenderedFieldsPreview()).toEqual([
            { key: 'subTitle', value: 'First doc - subTitle' },
          ]);
        });

        test('should display the value returned by the _execute API and fallback to _source if "Set value" is turned off', async () => {
          httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['valueFromExecuteAPI'] });

          const {
            actions: { toggleFormRow, fields, waitForPreviewUpdate, getRenderedFieldsPreview },
          } = testBed;

          await toggleFormRow('value');
          await fields.updateName('description'); // Field name is a field in _source
          await fields.updateScript('echo("hello")');
          await waitForPreviewUpdate();

          // We render the value from the _execute API
          expect(getRenderedFieldsPreview()).toEqual([
            { key: 'description', value: 'valueFromExecuteAPI' },
          ]);

          await toggleFormRow('format', 'on');
          await toggleFormRow('value', 'off');

          // Fallback to _source value when "Set value" is turned off and we have a format
          expect(getRenderedFieldsPreview()).toEqual([
            { key: 'description', value: 'First doc - description' },
          ]);
        });
      });

      test('should set the value returned by the painless _execute API', async () => {
        const scriptEmitResponse = 'Field emit() response';
        httpRequestsMockHelpers.setFieldPreviewResponse({ values: [scriptEmitResponse] });

        const {
          actions: {
            toggleFormRow,
            fields,
            waitForPreviewUpdate,
            getLatestPreviewHttpRequest,
            getRenderedFieldsPreview,
          },
        } = testBed;

        await toggleFormRow('value');
        await fields.updateName('myRuntimeField');
        await fields.updateScript('echo("hello")');
        await waitForPreviewUpdate();

        const request = getLatestPreviewHttpRequest(server);

        // Make sure the payload sent is correct
        expect(request.requestBody).toEqual({
          context: 'keyword_field',
          document: {
            description: 'First doc - description',
            subTitle: 'First doc - subTitle',
            title: 'First doc - title',
          },
          index: 'testIndex',
          script: {
            source: 'echo("hello")',
          },
        });

        // And that we display the response
        expect(getRenderedFieldsPreview()).toEqual([
          { key: 'myRuntimeField', value: scriptEmitResponse },
        ]);
      });

      test('should display an updating indicator while fetching the preview', async () => {
        httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['ok'] });

        const {
          exists,
          actions: { toggleFormRow, fields, waitForPreviewUpdate },
        } = testBed;

        await toggleFormRow('value');
        expect(exists('isUpdatingIndicator')).toBe(false);

        await fields.updateScript('echo("hello")');
        expect(exists('isUpdatingIndicator')).toBe(true);

        await waitForPreviewUpdate();
        expect(exists('isUpdatingIndicator')).toBe(false);
      });

      test('should not display the updating indicator when neither the type nor the script has changed', async () => {
        httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['ok'] });

        const {
          exists,
          actions: { toggleFormRow, fields, waitForPreviewUpdate },
        } = testBed;

        await toggleFormRow('value');
        await fields.updateName('myRuntimeField');
        await fields.updateScript('echo("hello")');
        expect(exists('isUpdatingIndicator')).toBe(true);
        await waitForPreviewUpdate();
        expect(exists('isUpdatingIndicator')).toBe(false);

        await fields.updateName('nameChanged');
        // We haven't changed the type nor the script so there should not be any updating indicator
        expect(exists('isUpdatingIndicator')).toBe(false);
      });
    });

    describe('format', () => {
      test('should apply the format to the value', async () => {
        /**
         * Each of the formatter has already its own test. Here we are simply
         * doing a smoke test to make sure that the preview panel applies the formatter
         * to the runtime field value.
         * We do that by mocking (in "setup_environment.tsx") the implementation of the
         * the fieldFormats.getInstance() handler.
         */
        const scriptEmitResponse = 'hello';
        httpRequestsMockHelpers.setFieldPreviewResponse({ values: [scriptEmitResponse] });

        const {
          actions: { toggleFormRow, fields, waitForPreviewUpdate, getRenderedFieldsPreview },
        } = testBed;

        await fields.updateName('myRuntimeField');
        await toggleFormRow('value');
        await fields.updateScript('echo("hello")');
        await waitForPreviewUpdate();

        // before
        expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'hello' }]);

        // after
        await toggleFormRow('format');
        await fields.updateFormat(fieldFormatsOptions[0].id); // select 'upper' format
        await waitForPreviewUpdate();
        expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'HELLO' }]);
      });
    });

    describe('error handling', () => {
      test('should display the error returned by the Painless _execute API', async () => {
        const error = createPreviewError({ reason: 'Houston we got a problem' });
        httpRequestsMockHelpers.setFieldPreviewResponse({ values: [], error, status: 400 });

        const {
          exists,
          find,
          actions: { toggleFormRow, fields, waitForPreviewUpdate, getRenderedFieldsPreview },
        } = testBed;

        await fields.updateName('myRuntimeField');
        await toggleFormRow('value');
        await fields.updateScript('bad()');
        await waitForPreviewUpdate();

        expect(exists('fieldPreviewItem')).toBe(false);
        expect(exists('indexPatternFieldList')).toBe(false);
        expect(exists('previewError')).toBe(true);
        expect(find('previewError.title').text()).toBe('Error compiling the painless script');
        expect(find('previewError.reason').text()).toBe(error.caused_by.reason);

        httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['ok'] });
        await fields.updateScript('echo("ok")');
        await waitForPreviewUpdate();

        expect(exists('fieldPreviewItem')).toBe(true);
        expect(find('indexPatternFieldList.listItem').length).toBeGreaterThan(0);
        expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'ok' }]);
      });
    });

    describe('Cluster document load and navigation', () => {
      test('should update the field list when the document changes', async () => {
        const {
          actions: {
            toggleFormRow,
            fields,
            getRenderedIndexPatternFields,
            goToNextDocument,
            goToPreviousDocument,
          },
        } = testBed;

        await toggleFormRow('value');
        await fields.updateName('myRuntimeField');

        expect(getRenderedIndexPatternFields()[0]).toEqual({
          key: 'title',
          value: doc1._source.title,
        });

        await goToNextDocument();
        expect(getRenderedIndexPatternFields()[0]).toEqual({
          key: 'title',
          value: doc2._source.title,
        });

        await goToNextDocument();
        expect(getRenderedIndexPatternFields()[0]).toEqual({
          key: 'title',
          value: doc3._source.title,
        });

        // We are back to the first document of the list
        await goToNextDocument();
        expect(getRenderedIndexPatternFields()[0]).toEqual({
          key: 'title',
          value: doc1._source.title,
        });

        // Let's go backward
        await goToPreviousDocument();
        expect(getRenderedIndexPatternFields()[0]).toEqual({
          key: 'title',
          value: doc3._source.title,
        });

        await goToPreviousDocument();
        expect(getRenderedIndexPatternFields()[0]).toEqual({
          key: 'title',
          value: doc2._source.title,
        });
      });

      test('should update the field preview value when the document changes', async () => {
        httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['valueDoc1'] });
        const {
          actions: {
            toggleFormRow,
            fields,
            waitForPreviewUpdate,
            getRenderedFieldsPreview,
            goToNextDocument,
          },
        } = testBed;

        await toggleFormRow('value');
        await fields.updateName('myRuntimeField');
        await fields.updateScript('echo("hello world")');
        await waitForPreviewUpdate();

        expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'valueDoc1' }]);

        httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['valueDoc2'] });
        await goToNextDocument();
        await waitForPreviewUpdate();

        expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'valueDoc2' }]);
      });
    });
  });
});
