/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsDoc } from './helpers';
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
import { screen, within } from '@testing-library/react';

describe('Field editor Preview panel', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const queryPreviewEmptyPrompt = () => {
    for (const previewPanel of screen.queryAllByTestId('previewPanel')) {
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

  beforeEach(() => {
    httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['mockedScriptValue'] });
    setIndexPatternFields(indexPatternFields);
    spyGetFieldsForWildcard.mockResolvedValue({ fields: indexPatternFields });
    setSearchResponse(mockDocuments);
    setSearchResponseLatency(0);
  });

  it('should display the preview panel along with the editor', async () => {
    await setup();

    expect(screen.queryByTestId('previewPanel')).toBeVisible();
  });

  it('should correctly set the title and subtitle of the panel', async () => {
    const {
      actions: { fields, toggleFormRow },
    } = await setup();

    await toggleFormRow('value');
    await fields.updateName('myRuntimeField');

    expect(screen.getByText('Preview')).toBeVisible();
    expect(screen.getByText(`From: ${indexPatternNameForTest}`)).toBeVisible();
  });

  it('should list the list of fields of the index pattern', async () => {
    const {
      actions: { fields, getRenderedIndexPatternFields, toggleFormRow },
    } = await setup();

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

  it('should filter down the field in the list', async () => {
    const {
      actions: {
        clearFieldSearch,
        fields,
        getRenderedIndexPatternFields,
        setFilterFieldsValue,
        toggleFormRow,
      },
    } = await setup();

    await toggleFormRow('value');
    await fields.updateName('myRuntimeField');

    // Should find a single field
    await setFilterFieldsValue('descr');
    expect(getRenderedIndexPatternFields()).toEqual([
      { key: 'description', value: 'First doc - description' },
    ]);

    // Should be case insensitive
    await setFilterFieldsValue('title');
    expect(screen.queryByTestId('emptySearchResult')).not.toBeInTheDocument();
    expect(getRenderedIndexPatternFields()).toEqual([
      { key: 'subTitle', value: 'First doc - subTitle' },
      { key: 'title', value: 'First doc - title' },
    ]);

    // Should display an empty search result with a button to clear
    await setFilterFieldsValue('doesNotExist');
    expect(screen.queryByTestId('emptySearchResult')).toBeVisible();
    expect(getRenderedIndexPatternFields()).toEqual([]);
    expect(screen.queryByText('Clear search')).toBeVisible();

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

  it('should pin the field to the top of the list', async () => {
    const {
      actions: {
        fields,
        getRenderedIndexPatternFieldElements,
        getRenderedIndexPatternFields,
        pinFieldAt,
        toggleFormRow,
      },
    } = await setup();

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
    it('should display an empty prompt if no name and no script are defined', async () => {
      const {
        actions: { fields, toggleFormRow },
      } = await setup();

      await toggleFormRow('value');
      expect(screen.queryByTestId('previewPanel')).toBeVisible();
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

    it('should **not** display an empty prompt editing a document with a script', async () => {
      const field = {
        name: 'foo',
        type: 'ip' as const,
        script: {
          source: 'emit("hello world")',
        },
      };

      // We open the editor with a field to edit the empty prompt should not be there
      // as we have a script and we'll load the preview.
      const {
        actions: { flushPreviewAndSearchTimers },
      } = await setup({ fieldToEdit: field });

      await flushPreviewAndSearchTimers();

      expect(queryPreviewEmptyPrompt()).not.toBeInTheDocument();
    });

    it('should **not** display an empty prompt editing a document with format defined', async () => {
      const field = {
        name: 'foo',
        type: 'ip' as const,
        format: {
          id: 'upper',
          params: {},
        },
      };

      const {
        actions: { flushPreviewAndSearchTimers },
      } = await setup({ fieldToEdit: field });

      await flushPreviewAndSearchTimers();

      expect(queryPreviewEmptyPrompt()).not.toBeInTheDocument();
    });
  });

  describe('key & value', () => {
    it('should set an empty value when no script is provided', async () => {
      const {
        actions: { toggleFormRow, fields, getRenderedFieldsPreview },
      } = await setup();

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');

      expect(getRenderedFieldsPreview()).toEqual([
        { key: 'myRuntimeField', value: 'Value not set' },
      ]);
    });

    it('should set the value returned by the painless _execute API', async () => {
      const scriptEmitResponse = 'Field emit() response';
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: [scriptEmitResponse] });
      const {
        actions: { fields, flushPreviewAndSearchTimers, getRenderedFieldsPreview, toggleFormRow },
      } = await setup();

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
      it('should display the _source value when no script is provided and the name matched one of the fields in _source', async () => {
        const {
          actions: {
            fields,
            flushDocumentsAndPreviewTimers,
            getRenderedFieldsPreview,
            toggleFormRow,
          },
        } = await setup();

        await toggleFormRow('value');
        await fields.updateName('subTitle');
        await flushDocumentsAndPreviewTimers();

        expect(getRenderedFieldsPreview()).toEqual([
          { key: 'subTitle', value: 'First doc - subTitle' },
        ]);
      });

      it('should display the value returned by the _execute API and fallback to _source if "Set value" is turned off', async () => {
        httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['valueFromExecuteAPI'] });
        const {
          actions: { fields, flushPreviewAndSearchTimers, getRenderedFieldsPreview, toggleFormRow },
        } = await setup();

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
    beforeEach(() => {
      // Add some latency to be able to test the "updatingIndicator" state
      setSearchResponseLatency(2000);
    });

    it('should display an updating indicator while fetching the docs and the preview', async () => {
      // We want to test if the loading indicator is in the DOM, for that we don't want the server to
      // respond immediately. We'll manualy send the response.

      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['ok'] }, undefined, true);
      const {
        actions: { fields, flushPreviewAndSearchTimers, toggleFormRow },
      } = await setup();

      await fields.updateName('myRuntimeField'); // Give a name to remove the empty prompt
      expect(screen.queryByTestId('isUpdatingIndicator')).toBeVisible(); // indicator while fetching the docs

      await flushPreviewAndSearchTimers(); // wait for docs to be fetched
      expect(screen.queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();

      await toggleFormRow('value');
      expect(screen.queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();

      await fields.updateScript('echo("hello")');
      expect(screen.queryByTestId('isUpdatingIndicator')).toBeVisible(); // indicator while getting preview

      await flushPreviewAndSearchTimers();
      expect(screen.queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();
    });

    it('should not display the updating indicator when neither the type nor the script has changed', async () => {
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
      } = await setup();

      await flushPreviewAndSearchTimers(); // wait for docs to be fetched

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript('echo("hello")');
      expect(screen.queryByTestId('isUpdatingIndicator')).toBeVisible();

      await flushDocumentsAndPreviewTimers();

      expect(screen.queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();

      await fields.updateName('nameChanged');
      // We haven't changed the type nor the script so there should not be any updating indicator
      expect(screen.queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();
    });
  });

  describe('format', () => {
    it('should apply the format to the value', async () => {
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
      } = await setup();

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
    it('should display the error returned by the Painless _execute API', async () => {
      const error = createPreviewError({ reason: 'Houston we got a problem' });
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: [], error, status: 400 });
      const {
        actions: { fields, flushPreviewAndSearchTimers, getRenderedFieldsPreview, toggleFormRow },
      } = await setup();

      expect(screen.queryByTestId('scriptErrorBadge')).not.toBeInTheDocument();

      await fields.updateName('myRuntimeField');
      await toggleFormRow('value');
      await fields.updateScript('bad()');
      await flushPreviewAndSearchTimers(); // Run validations

      expect(screen.queryByTestId('scriptErrorBadge')).toBeVisible();
      expect(screen.queryByText(error.caused_by.reason)).toBeVisible();

      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['ok'] });
      await fields.updateScript('echo("ok")');
      await flushPreviewAndSearchTimers();

      expect(screen.queryByTestId('scriptErrorBadge')).not.toBeInTheDocument();
      expect(screen.queryByText(error.caused_by.reason)).not.toBeInTheDocument();
      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'ok' }]);
    });

    it('should handle error when a document is not found', async () => {
      const {
        actions: { toggleFormRow, fields, setDocumentId },
      } = await setup();

      await fields.updateName('myRuntimeField');
      await toggleFormRow('value');

      // We will return no document from the search
      setSearchResponse([]);

      await setDocumentId('wrongID');

      expect(screen.queryByTestId('fetchDocError')).toBeVisible();
      expect(screen.queryByText('Document ID not found')).toBeVisible();
      expect(screen.queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();
    });

    it('should clear the error when disabling "Set value"', async () => {
      const error = createPreviewError({ reason: 'Houston we got a problem' });
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: [], error, status: 400 });
      const {
        actions: { fields, flushPreviewAndSearchTimers, toggleFormRow },
      } = await setup();

      await toggleFormRow('value');
      await fields.updateScript('bad()');
      await flushPreviewAndSearchTimers(); // Run validations

      expect(screen.queryByTestId('scriptErrorBadge')).toBeVisible();
      expect(screen.queryByText(error.caused_by.reason)).toBeVisible();

      await toggleFormRow('value', 'off');

      expect(screen.queryByTestId('scriptErrorBadge')).not.toBeInTheDocument();
      expect(screen.queryByText(error.caused_by.reason)).not.toBeInTheDocument();
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

    it('should update the field list when the document changes', async () => {
      const {
        actions: { fields, getRenderedIndexPatternFields, goToNextDocument, goToPreviousDocument },
      } = await setup();

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

    it('should update the field preview value when the document changes', async () => {
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['valueDoc1'] });
      const {
        actions: { toggleFormRow, fields, getRenderedFieldsPreview, goToNextDocument },
      } = await setup();

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');
      await fields.updateScript('echo("hello world")');

      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'valueDoc1' }]);

      httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['valueDoc2'] });
      await goToNextDocument();

      expect(getRenderedFieldsPreview()).toEqual([{ key: 'myRuntimeField', value: 'valueDoc2' }]);
    });

    it('should load a custom document when an ID is passed', async () => {
      const {
        actions: {
          fields,
          getRenderedFieldsPreview,
          getRenderedIndexPatternFields,
          setDocumentId,
          toggleFormRow,
        },
      } = await setup();

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
      expect(screen.queryByTestId('documentsNav')).not.toBeInTheDocument();
      // There should be a link to load back the cluster data
      expect(screen.queryByTestId('loadDocsFromClusterButton')).toBeVisible();
    });

    it('should load back the cluster data after providing a custom ID', async () => {
      const {
        actions: {
          fields,
          flushPreviewAndSearchTimers,
          getRenderedFieldsPreview,
          loadDocumentsFromCluster,
          setDocumentId,
          toggleFormRow,
        },
      } = await setup();

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

    it('should not lose the state of single document vs cluster data after toggling on/off the empty prompt', async () => {
      const {
        actions: { fields, getRenderedIndexPatternFields, setDocumentId, toggleFormRow },
      } = await setup();

      await toggleFormRow('value');
      await fields.updateName('myRuntimeField');

      // Initial state where we have the cluster data loaded and the doc navigation
      expect(screen.queryByTestId('documentsNav')).toBeVisible();
      expect(screen.queryByTestId('loadDocsFromClusterButton')).not.toBeInTheDocument();

      setSearchResponse([customLoadedDoc]);

      await setDocumentId('123456');

      expect(screen.queryByTestId('documentsNav')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loadDocsFromClusterButton')).toBeVisible();

      // Clearing the name will display the empty prompt as we don't have any script
      await fields.updateName('');
      expect(queryPreviewEmptyPrompt()).toBeVisible();

      // Give another name to hide the empty prompt and show the preview panel back
      await fields.updateName('newName');
      expect(queryPreviewEmptyPrompt()).not.toBeInTheDocument();

      // We should still display the single document state
      expect(screen.queryByTestId('documentsNav')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loadDocsFromClusterButton')).toBeVisible();
      expect(getRenderedIndexPatternFields()[0]).toEqual({
        key: 'description',
        value: 'loaded doc - description',
      });
    });

    it('should send the correct params to the data plugin search() handler', async () => {
      const {
        actions: { fields, loadDocumentsFromCluster, setDocumentId },
      } = await setup();

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

    it('should not display the updating indicator and have a callout to indicate that preview is not available', async () => {
      setSearchResponseLatency(2000);
      const {
        actions: { fields, flushPreviewAndSearchTimers },
      } = await setup();

      await fields.updateName('myRuntimeField'); // Give a name to remove the empty prompt
      expect(screen.queryByTestId('isUpdatingIndicator')).toBeVisible(); // indicator while fetching the docs

      await flushPreviewAndSearchTimers(); // wait for docs to be fetched
      expect(screen.queryByTestId('isUpdatingIndicator')).not.toBeInTheDocument();
      expect(screen.queryByTestId('previewNotAvailableCallout')).toBeVisible();
    });
  });

  describe('composite runtime field', () => {
    it('should display composite editor when composite type is selected', async () => {
      const {
        actions: { fields, flushPreviewAndSearchTimers },
      } = await setup();

      await fields.updateType('Composite');
      await flushPreviewAndSearchTimers();
      expect(screen.queryByTestId('compositeEditor')).toBeVisible();
    });

    it('should show composite field types and update appropriately', async () => {
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: { 'composite_field.a': [1] } });
      const {
        actions: { fields, flushPreviewAndSearchTimers },
      } = await setup();

      await fields.updateType('Composite');
      await fields.updateScript("emit('a',1)");
      await flushPreviewAndSearchTimers();
      expect(screen.queryByTestId('typeField_0')).toBeVisible();

      // increase the number of fields
      httpRequestsMockHelpers.setFieldPreviewResponse({
        values: { 'composite_field.a': [1], 'composite_field.b': [1] },
      });
      await fields.updateScript("emit('a',1); emit('b',1)");
      await flushPreviewAndSearchTimers();
      expect(screen.queryByTestId('typeField_0')).toBeVisible();
      expect(screen.queryByTestId('typeField_1')).toBeVisible();

      // decrease the number of fields
      httpRequestsMockHelpers.setFieldPreviewResponse({
        values: { 'composite_field.a': [1] },
      });
      await fields.updateScript("emit('a',1)");
      await flushPreviewAndSearchTimers();
      expect(screen.queryByTestId('typeField_0')).toBeVisible();
      expect(screen.queryByTestId('typeField_1')).not.toBeInTheDocument();
    });
  });
});
