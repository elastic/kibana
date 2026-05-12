/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsDoc } from './helpers';
import type { FieldEditorFlyoutPreviewHarness } from './field_editor_flyout_preview.helpers';
import { createPreviewError, mockDocuments } from './helpers/mocks';
import {
  fieldFormatsOptions,
  indexPatternNameForTest,
  setSearchResponseLatency,
  setupEnvironment,
} from './helpers';
import {
  setup,
  setIndexPatternFields,
  getSearchCallMeta,
  setSearchResponse,
} from './field_editor_flyout_preview.helpers';
import { spyGetFieldsForWildcard } from './helpers/setup_environment';
import { within } from '@testing-library/react';

describe('Field editor Preview panel', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  let harness: FieldEditorFlyoutPreviewHarness;

  const rtl = () => within(harness.container);
  const getByText = (text: string) => rtl().getByText(text);
  const queryByText = (text: string) => rtl().queryByText(text);
  const queryByTestId = (testId: string) => rtl().queryByTestId(testId);
  const queryAllByTestId = (testId: string) => rtl().queryAllByTestId(testId);

  const queryPreviewEmptyPrompt = () => {
    for (const previewPanel of queryAllByTestId('previewPanel')) {
      const emptyPrompt = within(previewPanel).queryByTestId('emptyPrompt');

      if (emptyPrompt) return emptyPrompt;
    }

    return null;
  };

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

    harness = await setup();
  });

  test('should display the preview panel along with the editor', async () => {
    expect(queryByTestId('previewPanel')).toBeVisible();
  });

  test('should correctly set the title and subtitle of the panel', async () => {
    const {
      actions: { fields, toggleFormRow },
    } = harness;

    await toggleFormRow('value');
    await fields.updateName('myRuntimeField');

    expect(getByText('Preview')).toBeVisible();
    expect(getByText(`From: ${indexPatternNameForTest}`)).toBeVisible();
  });

  test('should list the list of fields of the index pattern', async () => {
    const {
      actions: { fields, getRenderedIndexPatternFields, toggleFormRow },
    } = harness;

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
      actions: {
        clearFieldSearch,
        fields,
        getRenderedIndexPatternFields,
        setFilterFieldsValue,
        toggleFormRow,
      },
    } = harness;

    await toggleFormRow('value');
    await fields.updateName('myRuntimeField');

    // Should find a single field
    await setFilterFieldsValue('descr');
    expect(getRenderedIndexPatternFields()).toEqual([
      { key: 'description', value: 'First doc - description' },
    ]);

    // Should be case insensitive
    await setFilterFieldsValue('title');
    expect(queryByTestId('emptySearchResult')).not.toBeInTheDocument();
    expect(getRenderedIndexPatternFields()).toEqual([
      { key: 'subTitle', value: 'First doc - subTitle' },
      { key: 'title', value: 'First doc - title' },
    ]);

    // Should display an empty search result with a button to clear
    await setFilterFieldsValue('doesNotExist');
    expect(queryByTestId('emptySearchResult')).toBeVisible();
    expect(getRenderedIndexPatternFields()).toEqual([]);
    expect(queryByText('Clear search')).toBeVisible();

    await clearFieldSearch();
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
      actions: {
        fields,
        getRenderedIndexPatternFieldElements,
        getRenderedIndexPatternFields,
        pinFieldAt,
        toggleFormRow,
      },
    } = harness;

    await toggleFormRow('value');
    await fields.updateName('myRuntimeField');

    const fieldsRendered = getRenderedIndexPatternFieldElements();

    expect(fieldsRendered).not.toBe(null);
    expect(fieldsRendered!.length).toBe(Object.keys(doc1.fields).length);
    // make sure that the last one if the "description" field
    expect(fieldsRendered![0].textContent).toBe('descriptionFirst doc - description');

    // Click the third field in the list ("description")
    await pinFieldAt(2);

    expect(getRenderedIndexPatternFields()).toEqual([
      { key: 'title', value: 'First doc - title' },
      { key: 'description', value: 'First doc - description' }, // Pinned!
      { key: 'subTitle', value: 'First doc - subTitle' },
    ]);
  });

  describe('empty prompt', () => {
    test('should display an empty prompt if no name and no script are defined', async () => {
      const {
        actions: { fields, toggleFormRow },
      } = harness;

      await toggleFormRow('value');
      expect(queryByTestId('previewPanel')).toBeVisible();
      expect(queryPreviewEmptyPrompt()).toBeVisible();

      await fields.updateName('someName');
      expect(queryPreviewEmptyPrompt()).not.toBeInTheDocument();

      await fields.updateName(' ');
      expect(queryPreviewEmptyPrompt()).toBeVisible();

      // The name is empty and the empty prompt is displayed, let's now add a script...
      await fields.updateScript('echo("hello")');
      expect(queryPreviewEmptyPrompt()).not.toBeInTheDocument();

      await fields.updateScript(' ');
      expect(queryPreviewEmptyPrompt()).toBeVisible();
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
      harness = await setup({ fieldToEdit: field });
      const { actions } = harness;

      await actions.flushPreviewAndSearchTimers();

      expect(queryPreviewEmptyPrompt()).not.toBeInTheDocument();
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

      harness = await setup({ fieldToEdit: field });
      const { actions } = harness;

      await actions.flushPreviewAndSearchTimers();

      expect(queryPreviewEmptyPrompt()).not.toBeInTheDocument();
    });
  });

  describe('key & value', () => {
    test('should set an empty value when no script is provided', async () => {
      const {
        actions: { toggleFormRow, fields, getRenderedFieldsPreview },
      } = harness;

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
        actions: { fields, flushPreviewAndSearchTimers, getRenderedFieldsPreview, toggleFormRow },
      } = harness;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript('echo("hello")');
      await flushPreviewAndSearchTimers(); // Run validations

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

    describe('read from _source', () => {
      test('should display the _source value when no script is provided and the name matched one of the fields in _source', async () => {
        const {
          actions: {
            fields,
            flushDocumentsAndPreviewTimers,
            getRenderedFieldsPreview,
            toggleFormRow,
          },
        } = harness;

        await toggleFormRow('value');
        await fields.updateName('subTitle');
        await flushDocumentsAndPreviewTimers();

        expect(getRenderedFieldsPreview()).toEqual([
          { key: 'subTitle', value: 'First doc - subTitle' },
        ]);
      });

      test('should display the value returned by the _execute API and fallback to _source if "Set value" is turned off', async () => {
        httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['valueFromExecuteAPI'] });

        const {
          actions: { fields, flushPreviewAndSearchTimers, getRenderedFieldsPreview, toggleFormRow },
        } = harness;
        await flushPreviewAndSearchTimers(); // fetch documents

        await toggleFormRow('value');
        await fields.updateName('description'); // Field name is a field in _source
        await fields.updateScript('echo("hello")');
        await flushPreviewAndSearchTimers(); // Run validations

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
      harness = await setup();
    });

    test('should display an updating indicator while fetching the docs and the preview', async () => {
      // We want to test if the loading indicator is in the DOM, for that we don't want the server to
      // respond immediately. We'll manualy send the response.

      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['ok'] }, undefined, true);

      const {
        actions: { fields, flushPreviewAndSearchTimers, toggleFormRow },
      } = harness;
      await fields.updateName('myRuntimeField'); // Give a name to remove the empty prompt
      expect(queryByTestId('isUpdatingIndicator')).toBeVisible(); // indicator while fetching the docs

      await flushPreviewAndSearchTimers(); // wait for docs to be fetched
      expect(queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();

      await toggleFormRow('value');
      expect(queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();

      await fields.updateScript('echo("hello")');
      expect(queryByTestId('isUpdatingIndicator')).toBeVisible(); // indicator while getting preview

      await flushPreviewAndSearchTimers();
      expect(queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();
    });

    test('should not display the updating indicator when neither the type nor the script has changed', async () => {
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['ok'] }, undefined, true);
      // We want to test if the loading indicator is in the DOM, for that we need to manually
      // send the response from the server

      const {
        actions: {
          fields,
          flushDocumentsAndPreviewTimers,
          flushPreviewAndSearchTimers,
          toggleFormRow,
        },
      } = harness;
      await flushPreviewAndSearchTimers(); // wait for docs to be fetched

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript('echo("hello")');
      expect(queryByTestId('isUpdatingIndicator')).toBeVisible();

      await flushDocumentsAndPreviewTimers();

      expect(queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();

      await fields.updateName('nameChanged');
      // We haven't changed the type nor the script so there should not be any updating indicator
      expect(queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();
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
          fields,
          flushDocumentsAndPreviewTimers,
          flushPreviewAndSearchTimers,
          getRenderedFieldsPreview,
          toggleFormRow,
        },
      } = harness;

      await fields.updateName('myRuntimeField');
      await toggleFormRow('value');
      await fields.updateScript('echo("hello")');
      await flushDocumentsAndPreviewTimers();

      // before
      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'hello' }]);

      // after
      await toggleFormRow('format');
      await fields.updateFormat(fieldFormatsOptions[0].id); // select 'upper' format
      await flushPreviewAndSearchTimers();
      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'HELLO' }]);
    });
  });

  describe('error handling', () => {
    test('should display the error returned by the Painless _execute API', async () => {
      const error = createPreviewError({ reason: 'Houston we got a problem' });
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: [], error, status: 400 });

      const {
        actions: { fields, flushPreviewAndSearchTimers, getRenderedFieldsPreview, toggleFormRow },
      } = harness;

      expect(queryByTestId('scriptErrorBadge')).not.toBeInTheDocument();

      await fields.updateName('myRuntimeField');
      await toggleFormRow('value');
      await fields.updateScript('bad()');
      await flushPreviewAndSearchTimers(); // Run validations

      expect(queryByTestId('scriptErrorBadge')).toBeVisible();
      expect(queryByText(error.caused_by.reason)).toBeVisible();

      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['ok'] });
      await fields.updateScript('echo("ok")');
      await flushPreviewAndSearchTimers();

      expect(queryByTestId('scriptErrorBadge')).not.toBeInTheDocument();
      expect(queryByText(error.caused_by.reason)).not.toBeInTheDocument();
      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'ok' }]);
    });

    test('should handle error when a document is not found', async () => {
      const {
        actions: { toggleFormRow, fields, setDocumentId },
      } = harness;

      await fields.updateName('myRuntimeField');
      await toggleFormRow('value');

      // We will return no document from the search
      setSearchResponse([]);

      await setDocumentId('wrongID');

      expect(queryByTestId('fetchDocError')).toBeVisible();
      expect(queryByText('Document ID not found')).toBeVisible();
      expect(queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();
    });

    test('should clear the error when disabling "Set value"', async () => {
      const error = createPreviewError({ reason: 'Houston we got a problem' });
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: [], error, status: 400 });

      const {
        actions: { fields, flushPreviewAndSearchTimers, toggleFormRow },
      } = harness;

      await toggleFormRow('value');
      await fields.updateScript('bad()');
      await flushPreviewAndSearchTimers(); // Run validations

      expect(queryByTestId('scriptErrorBadge')).toBeVisible();
      expect(queryByText(error.caused_by.reason)).toBeVisible();

      await toggleFormRow('value', 'off');

      expect(queryByTestId('scriptErrorBadge')).not.toBeInTheDocument();
      expect(queryByText(error.caused_by.reason)).not.toBeInTheDocument();
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
      } = harness;

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
      } = harness;

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
        actions: {
          fields,
          getRenderedFieldsPreview,
          getRenderedIndexPatternFields,
          setDocumentId,
          toggleFormRow,
        },
      } = harness;

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

      await setDocumentId('123456');

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
      expect(queryByTestId('documentsNav')).not.toBeInTheDocument();
      // There should be a link to load back the cluster data
      expect(queryByTestId('loadDocsFromClusterButton')).toBeVisible();
    });

    test('should load back the cluster data after providing a custom ID', async () => {
      const {
        actions: {
          fields,
          flushPreviewAndSearchTimers,
          getRenderedFieldsPreview,
          loadDocumentsFromCluster,
          setDocumentId,
          toggleFormRow,
        },
      } = harness;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript('echo("hello world")');
      await flushPreviewAndSearchTimers(); // fetch preview

      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['loadedDocPreview'] });
      setSearchResponse([customLoadedDoc]);

      // Load a custom document ID
      await setDocumentId('123456');

      // Load back the cluster data
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['clusterDataDocPreview'] });
      setSearchResponse(mockDocuments);

      await loadDocumentsFromCluster();

      // The preview should be updated with the cluster data preview
      expect(getRenderedFieldsPreview()).toEqual([
        { key: 'myRuntimeField', value: 'clusterDataDocPreview' },
      ]);
    });

    test('should not lose the state of single document vs cluster data after toggling on/off the empty prompt', async () => {
      const {
        actions: { fields, getRenderedIndexPatternFields, setDocumentId, toggleFormRow },
      } = harness;

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');

      // Initial state where we have the cluster data loaded and the doc navigation
      expect(queryByTestId('documentsNav')).toBeVisible();
      expect(queryByTestId('loadDocsFromClusterButton')).not.toBeInTheDocument();

      setSearchResponse([customLoadedDoc]);

      await setDocumentId('123456');

      expect(queryByTestId('documentsNav')).not.toBeInTheDocument();
      expect(queryByTestId('loadDocsFromClusterButton')).toBeVisible();

      // Clearing the name will display the empty prompt as we don't have any script
      await fields.updateName('');
      expect(queryPreviewEmptyPrompt()).toBeVisible();

      // Give another name to hide the empty prompt and show the preview panel back
      await fields.updateName('newName');
      expect(queryPreviewEmptyPrompt()).not.toBeInTheDocument();

      // We should still display the single document state
      expect(queryByTestId('documentsNav')).not.toBeInTheDocument();
      expect(queryByTestId('loadDocsFromClusterButton')).toBeVisible();
      expect(getRenderedIndexPatternFields()[0]).toEqual({
        key: 'description',
        value: 'loaded doc - description',
      });
    });

    test('should send the correct params to the data plugin search() handler', async () => {
      const {
        actions: { fields, loadDocumentsFromCluster, setDocumentId },
      } = harness;

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
      await setDocumentId(nextId);

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
      await loadDocumentsFromCluster();
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
      harness = await setup();

      const {
        actions: { fields, flushPreviewAndSearchTimers },
      } = harness;
      await fields.updateName('myRuntimeField'); // Give a name to remove the empty prompt
      expect(queryByTestId('isUpdatingIndicator')).toBeVisible(); // indicator while fetching the docs

      await flushPreviewAndSearchTimers(); // wait for docs to be fetched
      expect(queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();
      expect(queryByTestId('previewNotAvailableCallout')).toBeVisible();
    });
  });

  describe('composite runtime field', () => {
    test('should display composite editor when composite type is selected', async () => {
      harness = await setup();
      const {
        actions: { fields, flushPreviewAndSearchTimers },
      } = harness;
      await fields.updateType('Composite');
      await flushPreviewAndSearchTimers();
      expect(queryByTestId('compositeEditor')).toBeVisible();
    });

    test('should show composite field types and update appropriately', async () => {
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: { 'composite_field.a': [1] } });
      harness = await setup();
      const {
        actions: { fields, flushPreviewAndSearchTimers },
      } = harness;
      await fields.updateType('Composite');
      await fields.updateScript("emit('a',1)");
      await flushPreviewAndSearchTimers();
      expect(queryByTestId('typeField_0')).toBeVisible();

      // increase the number of fields
      httpRequestsMockHelpers.setFieldPreviewResponse({
        values: { 'composite_field.a': [1], 'composite_field.b': [1] },
      });
      await fields.updateScript("emit('a',1); emit('b',1)");
      await flushPreviewAndSearchTimers();
      expect(queryByTestId('typeField_0')).toBeVisible();
      expect(queryByTestId('typeField_1')).toBeVisible();

      // decrease the number of fields
      httpRequestsMockHelpers.setFieldPreviewResponse({
        values: { 'composite_field.a': [1] },
      });
      await fields.updateScript("emit('a',1)");
      await flushPreviewAndSearchTimers();
      expect(queryByTestId('typeField_0')).toBeVisible();
      expect(queryByTestId('typeField_1')).not.toBeInTheDocument();
    });
  });
});
