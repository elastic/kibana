/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act } from 'react-dom/test-utils';

import type { EsDoc } from './helpers';
import {
  setupEnvironment,
  fieldFormatsOptions,
  indexPatternNameForTest,
  setSearchResponseLatency,
  spyIndexPatternGetByName,
} from './helpers';
import type { FieldEditorFlyoutContentTestBed } from './field_editor_flyout_preview.helpers';
import {
  setup,
  setIndexPatternFields,
  getSearchCallMeta,
  setSearchResponse,
} from './field_editor_flyout_preview.helpers';
import { mockDebounce } from './helpers/jest.mocks';
import { spyGetFieldsForWildcard } from './helpers/setup_environment';
import { mockDocuments, createPreviewError } from './helpers/mocks';

describe('Field editor Preview panel', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  let testBed: FieldEditorFlyoutContentTestBed;

  const [doc1, doc2, doc3] = mockDocuments;

  const indexPatternFields: Array<{ name: string; displayName: string }> = [
    {
      name: 'description',
      displayName: 'description',
    },
    {
      name: 'subTitle',
      displayName: 'subTitle',
    },
    {
      name: 'title',
      displayName: 'title',
    },
  ];

  beforeEach(async () => {
    httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['mockedScriptValue'] });
    setIndexPatternFields(indexPatternFields);
    spyGetFieldsForWildcard.mockResolvedValue({ fields: indexPatternFields });
    setSearchResponse(mockDocuments);
    setSearchResponseLatency(0);

    testBed = await setup();
  });

  test('should display the preview panel along with the editor', async () => {
    const { exists } = testBed;

    expect(exists('previewPanel')).toBe(true);
  });

  test('should correctly set the title and subtitle of the panel', async () => {
    const {
      find,
      actions: { toggleFormRow, fields },
    } = testBed;

    await toggleFormRow('value');
    await fields.updateName('myRuntimeField');

    expect(find('previewPanel.title').text()).toBe('Preview');
    expect(find('previewPanel.subTitle').text()).toBe(`From: ${indexPatternNameForTest}`);
  });

  test('should list the list of fields of the index pattern', async () => {
    const {
      actions: { toggleFormRow, fields, getRenderedIndexPatternFields },
    } = testBed;

    await toggleFormRow('value');
    await fields.updateName('myRuntimeField');

    expect(getRenderedIndexPatternFields()).toEqual([
      {
        key: 'description',
        value: mockDocuments[0].fields.description,
      },
      {
        key: 'subTitle',
        value: mockDocuments[0].fields.subTitle,
      },
      {
        key: 'title',
        value: mockDocuments[0].fields.title,
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
      { key: 'subTitle', value: 'First doc - subTitle' },
      { key: 'title', value: 'First doc - title' },
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
        key: 'description',
        value: mockDocuments[0].fields.description,
      },
      {
        key: 'subTitle',
        value: mockDocuments[0].fields.subTitle,
      },
      {
        key: 'title',
        value: mockDocuments[0].fields.title,
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

    expect(fieldsRendered).not.toBe(null);
    expect(fieldsRendered!.length).toBe(Object.keys(doc1.fields).length);
    // make sure that the last one if the "description" field
    expect(fieldsRendered!.at(0).text()).toBe('descriptionFirst doc - description');

    // Click the third field in the list ("description")
    const descriptionField = fieldsRendered!.at(2);
    find('pinFieldButton', descriptionField).simulate('click');
    component.update();

    expect(getRenderedIndexPatternFields()).toEqual([
      { key: 'title', value: 'First doc - title' },
      { key: 'description', value: 'First doc - description' }, // Pinned!
      { key: 'subTitle', value: 'First doc - subTitle' },
    ]);
  });

  describe('empty prompt', () => {
    test('should display an empty prompt if no name and no script are defined', async () => {
      const {
        exists,
        actions: { toggleFormRow, fields },
      } = testBed;

      await toggleFormRow('value');
      expect(exists('previewPanel')).toBe(true);
      expect(exists('previewPanel.emptyPrompt')).toBe(true);

      await fields.updateName('someName');
      expect(exists('previewPanel.emptyPrompt')).toBe(false);

      await fields.updateName(' ');
      expect(exists('previewPanel.emptyPrompt')).toBe(true);

      // The name is empty and the empty prompt is displayed, let's now add a script...
      await fields.updateScript('echo("hello")');
      expect(exists('previewPanel.emptyPrompt')).toBe(false);

      await fields.updateScript(' ');
      expect(exists('previewPanel.emptyPrompt')).toBe(true);
    });

    test('should **not** display an empty prompt editing a document with a script', async () => {
      const field = {
        name: 'foo',
        type: 'ip' as const,
        script: {
          source: 'emit("hello world")',
        },
      };

      // We open the editor with a field to edit the empty prompt should not be there
      // as we have a script and we'll load the preview.
      await act(async () => {
        testBed = await setup({ fieldToEdit: field });
      });

      const { exists, component } = testBed;
      component.update();

      expect(exists('previewPanel.emptyPrompt')).toBe(false);
    });

    test('should **not** display an empty prompt editing a document with format defined', async () => {
      const field = {
        name: 'foo',
        type: 'ip' as const,
        format: {
          id: 'upper',
          params: {},
        },
      };

      await act(async () => {
        testBed = await setup({ fieldToEdit: field });
      });

      const { exists, component } = testBed;
      component.update();

      expect(exists('previewPanel.emptyPrompt')).toBe(false);
    });
  });

  describe('key & value', () => {
    test('should set an empty value when no script is provided', async () => {
      const {
        actions: { toggleFormRow, fields, getRenderedFieldsPreview },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');

      expect(getRenderedFieldsPreview()).toEqual([
        { key: 'myRuntimeField', value: 'Value not set' },
      ]);
    });

    test('should set the value returned by the painless _execute API', async () => {
      const scriptEmitResponse = 'Field emit() response';
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: [scriptEmitResponse] });

      const {
        actions: { toggleFormRow, fields, waitForUpdates, getRenderedFieldsPreview },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript('echo("hello")');
      await waitForUpdates(); // Run validations

      // Make sure the payload sent is correct
      const firstCall = server.post.mock.calls[0] as Array<{ body: any }>;
      const payload = JSON.parse(firstCall[1]?.body);
      expect(payload).toEqual({
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

    it('should display all the values when the script emits multiple values', async () => {
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['a', 'b'] });
      const {
        actions: { fields, waitForUpdates, getRenderedFieldsPreview, toggleFormRow },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript("emit('a'); emit('b');");
      await waitForUpdates();

      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: '[a, b]' }]);
    });

    it('should display "Value not set" when the script emits no value', async () => {
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: [] });
      const {
        actions: { fields, waitForUpdates, getRenderedFieldsPreview, toggleFormRow },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript("if (false) { emit('a'); }");
      await waitForUpdates();

      expect(getRenderedFieldsPreview()).toEqual([
        { key: 'myRuntimeField', value: 'Value not set' },
      ]);
    });

    describe('read from _source', () => {
      test('should display the _source value when no script is provided and the name matched one of the fields in _source', async () => {
        const {
          actions: {
            toggleFormRow,
            fields,
            getRenderedFieldsPreview,
            waitForDocumentsAndPreviewUpdate,
          },
        } = testBed;

        await toggleFormRow('value');
        await fields.updateName('subTitle');
        await waitForDocumentsAndPreviewUpdate();

        expect(getRenderedFieldsPreview()).toEqual([
          { key: 'subTitle', value: 'First doc - subTitle' },
        ]);
      });

      test('should display the value returned by the _execute API and fallback to _source if "Set value" is turned off', async () => {
        httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['valueFromExecuteAPI'] });

        const {
          actions: { toggleFormRow, fields, waitForUpdates, getRenderedFieldsPreview },
        } = testBed;
        await waitForUpdates(); // fetch documents

        await toggleFormRow('value');
        await fields.updateName('description'); // Field name is a field in _source
        await fields.updateScript('echo("hello")');
        await waitForUpdates(); // Run validations

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
  });

  describe('updating indicator', () => {
    beforeEach(async () => {
      // Add some latency to be able to test the "updatingIndicator" state
      setSearchResponseLatency(2000);
      testBed = await setup();
    });

    test('should display an updating indicator while fetching the docs and the preview', async () => {
      // We want to test if the loading indicator is in the DOM, for that we don't want the server to
      // respond immediately. We'll manualy send the response.

      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['ok'] }, undefined, true);

      const {
        exists,
        actions: { toggleFormRow, fields, waitForUpdates },
      } = testBed;
      await fields.updateName('myRuntimeField'); // Give a name to remove the empty prompt
      expect(exists('isUpdatingIndicator')).toBe(true); // indicator while fetching the docs

      await waitForUpdates(); // wait for docs to be fetched
      expect(exists('isUpdatingIndicator')).toBe(false);

      await toggleFormRow('value');
      expect(exists('isUpdatingIndicator')).toBe(false);

      await fields.updateScript('echo("hello")');
      expect(exists('isUpdatingIndicator')).toBe(true); // indicator while getting preview

      await waitForUpdates();
      expect(exists('isUpdatingIndicator')).toBe(false);
    });

    test('should not display the updating indicator when neither the type nor the script has changed', async () => {
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['ok'] }, undefined, true);
      // We want to test if the loading indicator is in the DOM, for that we need to manually
      // send the response from the server

      const {
        exists,
        actions: { toggleFormRow, fields, waitForUpdates, waitForDocumentsAndPreviewUpdate },
      } = testBed;
      await waitForUpdates(); // wait for docs to be fetched

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript('echo("hello")');
      expect(exists('isUpdatingIndicator')).toBe(true);

      await waitForDocumentsAndPreviewUpdate();

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
        actions: {
          toggleFormRow,
          fields,
          waitForUpdates,
          waitForDocumentsAndPreviewUpdate,
          getRenderedFieldsPreview,
        },
      } = testBed;

      await fields.updateName('myRuntimeField');
      await toggleFormRow('value');
      await fields.updateScript('echo("hello")');
      await waitForDocumentsAndPreviewUpdate();

      // before
      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'hello' }]);

      // after
      await toggleFormRow('format');
      await fields.updateFormat(fieldFormatsOptions[0].id); // select 'upper' format
      await waitForUpdates();
      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'HELLO' }]);
    });
  });

  describe('error handling', () => {
    test('should display the error returned by the Painless _execute API', async () => {
      const error = createPreviewError({ reason: 'Houston we got a problem' });
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: [], error, status: 400 });

      const {
        exists,
        actions: { toggleFormRow, fields, waitForUpdates, getRenderedFieldsPreview },
      } = testBed;

      expect(exists('scriptErrorBadge')).toBe(false);

      await fields.updateName('myRuntimeField');
      await toggleFormRow('value');
      await fields.updateScript('bad()');
      await waitForUpdates(); // Run validations

      expect(exists('scriptErrorBadge')).toBe(true);
      expect(fields.getScriptError()).toBe(error.caused_by.reason);

      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['ok'] });
      await fields.updateScript('echo("ok")');
      await waitForUpdates();

      expect(exists('scriptErrorBadge')).toBe(false);
      expect(fields.getScriptError()).toBe(null);
      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'ok' }]);
    });

    test('should handle error when a document is not found', async () => {
      const {
        exists,
        find,
        form,
        component,
        actions: { toggleFormRow, fields },
      } = testBed;

      await fields.updateName('myRuntimeField');
      await toggleFormRow('value');

      // We will return no document from the search
      setSearchResponse([]);

      await act(async () => {
        form.setInputValue('documentIdField', 'wrongID');
      });
      component.update();

      expect(exists('fetchDocError')).toBe(true);
      expect(find('fetchDocError').text()).toContain('Document ID not found');
      expect(exists('isUpdatingIndicator')).toBe(false);
    });

    test('should clear the error when disabling "Set value"', async () => {
      const error = createPreviewError({ reason: 'Houston we got a problem' });
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: [], error, status: 400 });

      const {
        exists,
        actions: { toggleFormRow, fields, waitForUpdates },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateScript('bad()');
      await waitForUpdates(); // Run validations

      expect(exists('scriptErrorBadge')).toBe(true);
      expect(fields.getScriptError()).toBe(error.caused_by.reason);

      await toggleFormRow('value', 'off');

      expect(exists('scriptErrorBadge')).toBe(false);
      expect(fields.getScriptError()).toBe(null);
    });
  });

  describe('responses of requests that are no longer current', () => {
    beforeEach(() => {
      // The component rendered in the top-level beforeEach uses the mocked debounce, unmount it
      // before switching implementations so it doesn't re-render with a different set of hooks.
      testBed.component.unmount();
      mockDebounce.useRealImplementation = true;
    });

    afterEach(() => {
      mockDebounce.useRealImplementation = false;
    });

    const advanceDebounce = async () => {
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      testBed.component.update();
    };

    const resolveRequest = async (
      pending: ReturnType<typeof httpRequestsMockHelpers.deferFieldPreviewResponses>,
      index: number,
      body: Record<string, unknown>
    ) => {
      await act(async () => {
        pending.resolveRequest(index, body);
      });
      testBed.component.update();
    };

    it('should not invalidate the script with the error of a stale request', async () => {
      const pending = httpRequestsMockHelpers.deferFieldPreviewResponses();
      const onSave = jest.fn();
      // The new field name must not clash with the fields of the data view
      spyIndexPatternGetByName.mockReturnValue(undefined);
      testBed = await setup({ onSave });
      const {
        exists,
        find,
        form,
        actions: { fields, waitForUpdates, saveField, toggleFormRow },
      } = testBed;

      await fields.updateName('someName');
      await toggleFormRow('value');
      await waitForUpdates(); // wait for the docs to be fetched

      await fields.updateScript('bad()');
      await advanceDebounce();
      expect(pending.getRequestCount()).toBe(1); // request A is in flight

      await fields.updateScript('echo("ok")');
      const error = createPreviewError({ reason: 'Houston we got a problem' });
      await resolveRequest(pending, 0, { values: [], error, status: 400 });

      await advanceDebounce();
      expect(pending.getRequestCount()).toBe(2);
      await resolveRequest(pending, 1, { values: ['ok'] });
      await waitForUpdates();

      expect(form.getErrorsMessages()).not.toContain('Invalid Painless script.');
      expect(exists('scriptErrorBadge')).toBe(false);
      expect(find('fieldSaveButton').props().disabled).toBe(false);

      await saveField();
      await waitForUpdates();
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should issue a new request when the script goes back to the one of the in-flight request', async () => {
      const pending = httpRequestsMockHelpers.deferFieldPreviewResponses();
      testBed = await setup();
      const {
        exists,
        actions: { fields, waitForUpdates, getRenderedFieldsPreview, toggleFormRow },
      } = testBed;

      await fields.updateName('myRuntimeField');
      await toggleFormRow('value');
      await waitForUpdates(); // wait for the docs to be fetched

      await fields.updateScript('echo("a")');
      await advanceDebounce();
      expect(pending.getRequestCount()).toBe(1); // request A is in flight

      // Change the script and go back to the one of A within the debounce
      await fields.updateScript('echo("b")');
      await fields.updateScript('echo("a")');

      // The response of A is discarded
      await resolveRequest(pending, 0, { values: ['stale'] });
      expect(getRenderedFieldsPreview()).not.toContainEqual({
        key: 'myRuntimeField',
        value: 'stale',
      });

      await advanceDebounce();
      expect(pending.getRequestCount()).toBe(2);

      await resolveRequest(pending, 1, { values: ['fresh'] });
      await waitForUpdates();

      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'fresh' }]);
      expect(exists('isUpdatingIndicator')).toBe(false);
    });

    it('should not issue extra requests when no request is in flight', async () => {
      testBed = await setup();
      const {
        actions: { fields, waitForUpdates, toggleFormRow },
      } = testBed;

      await fields.updateName('myRuntimeField');
      await toggleFormRow('value');
      await waitForUpdates();

      const getRequestCount = () => server.post.mock.calls.length;
      const initialCount = getRequestCount();

      await fields.updateScript('echo("a")');
      await waitForUpdates();
      expect(getRequestCount()).toBe(initialCount + 1);

      // Not an _execute param
      await fields.updateName('nameChanged');
      await waitForUpdates();
      expect(getRequestCount()).toBe(initialCount + 1);

      await fields.updateScript('echo("b")');
      await waitForUpdates();
      expect(getRequestCount()).toBe(initialCount + 2);
    });
  });

  describe('Cluster document load and navigation', () => {
    const docContent = {
      title: 'loaded doc - title',
      subTitle: 'loaded doc - subTitle',
      description: 'loaded doc - description',
    };

    const customLoadedDoc: EsDoc = {
      _id: '123456',
      _index: 'otherIndex',
      fields: docContent,
      _source: docContent,
    };

    test('should update the field list when the document changes', async () => {
      const {
        actions: { fields, getRenderedIndexPatternFields, goToNextDocument, goToPreviousDocument },
      } = testBed;

      await fields.updateName('myRuntimeField'); // Give a name to remove empty prompt

      expect(getRenderedIndexPatternFields()[2]).toEqual({
        key: 'title',
        value: doc1.fields.title,
      });

      await goToNextDocument();
      expect(getRenderedIndexPatternFields()[2]).toEqual({
        key: 'title',
        value: doc2.fields.title,
      });

      await goToNextDocument();
      expect(getRenderedIndexPatternFields()[2]).toEqual({
        key: 'title',
        value: doc3.fields.title,
      });

      // Going next we circle back to the first document of the list
      await goToNextDocument();
      expect(getRenderedIndexPatternFields()[2]).toEqual({
        key: 'title',
        value: doc1.fields.title,
      });

      // Let's go backward
      await goToPreviousDocument();
      expect(getRenderedIndexPatternFields()[2]).toEqual({
        key: 'title',
        value: doc3.fields.title,
      });

      await goToPreviousDocument();
      expect(getRenderedIndexPatternFields()[2]).toEqual({
        key: 'title',
        value: doc2.fields.title,
      });
    });

    test('should update the field preview value when the document changes', async () => {
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['valueDoc1'] });
      const {
        actions: { toggleFormRow, fields, getRenderedFieldsPreview, goToNextDocument },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript('echo("hello world")');

      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'valueDoc1' }]);

      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['valueDoc2'] });
      await goToNextDocument();

      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'valueDoc2' }]);
    });

    test('should load a custom document when an ID is passed', async () => {
      const {
        component,
        form,
        exists,
        actions: { toggleFormRow, fields, getRenderedIndexPatternFields, getRenderedFieldsPreview },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript('echo("hello world")');

      // First make sure that we have the original cluster data is loaded
      // and the preview value rendered.
      expect(getRenderedIndexPatternFields()[2]).toEqual({
        key: 'title',
        value: doc1.fields.title,
      });
      expect(getRenderedFieldsPreview()).toEqual([
        { key: 'myRuntimeField', value: 'mockedScriptValue' },
      ]);

      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['loadedDocPreview'] });
      setSearchResponse([customLoadedDoc]);

      await act(async () => {
        form.setInputValue('documentIdField', '123456');
      });
      component.update();

      expect(getRenderedIndexPatternFields()).toEqual([
        {
          key: 'description',
          value: 'loaded doc - description',
        },
        {
          key: 'subTitle',
          value: 'loaded doc - subTitle',
        },
        {
          key: 'title',
          value: 'loaded doc - title',
        },
      ]);

      // The preview should have updated
      expect(getRenderedFieldsPreview()).toEqual([
        { key: 'myRuntimeField', value: 'loadedDocPreview' },
      ]);

      // The nav should not be there when loading a single document
      expect(exists('documentsNav')).toBe(false);
      // There should be a link to load back the cluster data
      expect(exists('loadDocsFromClusterButton')).toBe(true);
    });

    test('should load back the cluster data after providing a custom ID', async () => {
      const {
        form,
        component,
        find,
        actions: { toggleFormRow, fields, getRenderedFieldsPreview, waitForUpdates },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript('echo("hello world")');
      await waitForUpdates(); // fetch preview

      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['loadedDocPreview'] });
      setSearchResponse([customLoadedDoc]);

      // Load a custom document ID
      await act(async () => {
        form.setInputValue('documentIdField', '123456');
      });
      component.update();

      // Load back the cluster data
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['clusterDataDocPreview'] });
      setSearchResponse(mockDocuments);

      await act(async () => {
        find('loadDocsFromClusterButton').simulate('click');
      });
      component.update();

      // The preview should be updated with the cluster data preview
      expect(getRenderedFieldsPreview()).toEqual([
        { key: 'myRuntimeField', value: 'clusterDataDocPreview' },
      ]);
    });

    test('should not lose the state of single document vs cluster data after toggling on/off the empty prompt', async () => {
      const {
        form,
        component,
        exists,
        actions: { toggleFormRow, fields, getRenderedIndexPatternFields },
      } = testBed;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');

      // Initial state where we have the cluster data loaded and the doc navigation
      expect(exists('documentsNav')).toBe(true);
      expect(exists('loadDocsFromClusterButton')).toBe(false);

      setSearchResponse([customLoadedDoc]);

      await act(async () => {
        form.setInputValue('documentIdField', '123456');
      });
      component.update();

      expect(exists('documentsNav')).toBe(false);
      expect(exists('loadDocsFromClusterButton')).toBe(true);

      // Clearing the name will display the empty prompt as we don't have any script
      await fields.updateName('');
      expect(exists('previewPanel.emptyPrompt')).toBe(true);

      // Give another name to hide the empty prompt and show the preview panel back
      await fields.updateName('newName');
      expect(exists('previewPanel.emptyPrompt')).toBe(false);

      // We should still display the single document state
      expect(exists('documentsNav')).toBe(false);
      expect(exists('loadDocsFromClusterButton')).toBe(true);
      expect(getRenderedIndexPatternFields()[0]).toEqual({
        key: 'description',
        value: 'loaded doc - description',
      });
    });

    test('should send the correct params to the data plugin search() handler', async () => {
      const {
        form,
        component,
        find,
        actions: { fields },
      } = testBed;

      const expectedParamsToFetchClusterData = {
        params: {
          index: indexPatternNameForTest,
          fields: ['*'],
          size: 50,
        },
      };

      // Initial state
      let searchMeta = getSearchCallMeta();

      await fields.updateName('myRuntimeField'); // hide the empty prompt

      searchMeta = getSearchCallMeta();
      const initialCount = searchMeta.totalCalls;
      expect(searchMeta.lastCallParams).toEqual(expectedParamsToFetchClusterData);

      // Load single doc
      setSearchResponse([customLoadedDoc]);
      const nextId = '123456';
      await act(async () => {
        form.setInputValue('documentIdField', nextId);
      });
      component.update();

      searchMeta = getSearchCallMeta();
      expect(searchMeta.totalCalls).toBe(initialCount + 1);
      expect(searchMeta.lastCallParams).toEqual({
        params: {
          fields: ['*'],
          query: {
            ids: {
              values: [nextId],
            },
          },
          size: 1,
          index: indexPatternNameForTest,
        },
      });

      // Back to cluster data
      setSearchResponse(mockDocuments);
      await act(async () => {
        find('loadDocsFromClusterButton').simulate('click');
      });
      searchMeta = getSearchCallMeta();
      expect(searchMeta.totalCalls).toBe(initialCount + 2);
      expect(searchMeta.lastCallParams).toEqual(expectedParamsToFetchClusterData);
    });
  });

  describe('When no documents could be fetched from cluster', () => {
    beforeEach(() => {
      setSearchResponse([]);
    });

    test('should not display the updating indicator and have a callout to indicate that preview is not available', async () => {
      setSearchResponseLatency(2000);
      testBed = await setup();

      const {
        exists,
        actions: { fields, waitForUpdates },
      } = testBed;
      await fields.updateName('myRuntimeField'); // Give a name to remove the empty prompt
      expect(exists('isUpdatingIndicator')).toBe(true); // indicator while fetching the docs

      await waitForUpdates(); // wait for docs to be fetched
      expect(exists('isUpdatingIndicator')).toBe(false);
      expect(exists('previewNotAvailableCallout')).toBe(true);
    });
  });

  describe('composite runtime field', () => {
    test('should display composite editor when composite type is selected', async () => {
      testBed = await setup();
      const {
        exists,
        actions: { fields, waitForUpdates },
      } = testBed;
      fields.updateType('composite', 'Composite');
      await waitForUpdates();
      expect(exists('compositeEditor')).toBe(true);
    });

    test('should show composite field types and update appropriately', async () => {
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: { 'composite_field.a': [1] } });
      testBed = await setup();
      const {
        exists,
        actions: { fields, waitForUpdates },
      } = testBed;
      await fields.updateType('composite', 'Composite');
      await fields.updateScript("emit('a',1)");
      await waitForUpdates();
      expect(exists('typeField_0')).toBe(true);

      // increase the number of fields
      httpRequestsMockHelpers.setFieldPreviewResponse({
        values: { 'composite_field.a': [1], 'composite_field.b': [1] },
      });
      await fields.updateScript("emit('a',1); emit('b',1)");
      await waitForUpdates();
      expect(exists('typeField_0')).toBe(true);
      expect(exists('typeField_1')).toBe(true);

      // decrease the number of fields
      httpRequestsMockHelpers.setFieldPreviewResponse({
        values: { 'composite_field.a': [1] },
      });
      await fields.updateScript("emit('a',1)");
      await waitForUpdates();
      expect(exists('typeField_0')).toBe(true);
      expect(exists('typeField_1')).toBe(false);
    });

    it('should display all the values of a multi-value subfield and detect its type', async () => {
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: { 'composite_field.a': [1, 2] } });
      testBed = await setup();
      const {
        find,
        actions: { fields, waitForUpdates, getRenderedFieldsPreview },
      } = testBed;

      await fields.updateName('myRuntimeField');
      await fields.updateType('composite', 'Composite');
      await fields.updateScript("emit('a',1); emit('a',2)");
      await waitForUpdates();

      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField.a', value: '[1, 2]' }]);
      expect(find('typeField_0').props().value).toBe('double');
    });
  });
});
