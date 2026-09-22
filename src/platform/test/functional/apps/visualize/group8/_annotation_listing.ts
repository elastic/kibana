/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, annotationEditor } = getPageObjects(['visualize', 'annotationEditor']);
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const log = getService('log');
  const contentList = getService('contentList');

  describe('annotation listing page', function () {
    before(async function () {
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/annotation_listing_page_search'
      );
      // we need to test the missing data view scenario, so delete one of them
      // (can't just omit it from the archive because Kibana won't import with broken references)
      log.info(`deleting one data view to replicate missing data view scenario...`);
      await kibanaServer.request({
        method: 'DELETE',
        path: `/api/data_views/data_view/data-view-to-delete`,
      });

      await visualize.gotoVisualizationLandingPage();
      await visualize.selectAnnotationsTab();
      await contentList.waitForReady();
    });

    after(async function () {
      log.info(`unloading annotations and data views`);
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/annotation_listing_page_search'
      );
    });

    // Listing-level search / tag-filter / bulk-delete coverage now lives
    // in `src/platform/plugins/private/event_annotation_listing/test/scout/`
    // (parity with the new `@kbn/content-list` toolbar/selection wiring).
    // The cases below remain in FTR because they exercise the Lens annotation
    // editor surface, not the listing itself.

    describe('edit', function () {
      it('edits group metadata', async function () {
        await contentList.clickItemByName('group 3');
        await annotationEditor.editGroupMetadata({
          title: 'edited title',
          description: 'edited description',
        });
        await annotationEditor.saveGroup();

        await contentList.search('edited title');
        await contentList.expectItemCount(1);

        await contentList.search('edited description');
        await contentList.expectItemCount(1);
      });

      describe('individual annotations', () => {
        it('edits an existing annotation', async function () {
          await contentList.clickItemByName('edited title');
          expect(await annotationEditor.getAnnotationCount()).to.be(1);

          await annotationEditor.openAnnotation();
          await annotationEditor.configureAnnotation({
            query: 'my query',
            lineThickness: 5,
            color: '#FF0000',
          });
        });

        it('adds a new annotation', async function () {
          await annotationEditor.addAnnotation({
            query: 'other query',
            lineThickness: 3,
            color: '#00FF00',
          });

          await retry.try(async () => {
            expect(await annotationEditor.getAnnotationCount()).to.be(2);
          });
        });

        it('removes an annotation', async function () {
          await annotationEditor.removeAnnotation();

          await retry.try(async () => {
            expect(await annotationEditor.getAnnotationCount()).to.be(1);
          });

          await annotationEditor.saveGroup();
        });
      });

      describe('data view switching', () => {
        before(async () => {
          // `clearSearch` already awaits `waitForReady` internally.
          await contentList.clearSearch();
        });

        it('recovers from missing data view', async () => {
          await contentList.clickItemByName('missing data view');

          await retry.try(async () => {
            expect(await annotationEditor.showingMissingDataViewPrompt()).to.be(true);
          });

          await retry.try(async () => {
            await annotationEditor.editGroupMetadata({
              dataView: 'logs*',
            });
            expect(await annotationEditor.showingMissingDataViewPrompt()).to.be(false);
            // @TODO: re-enable this once the error bubbling issue is fixed at Lens custom component level
            // expect(await find.byCssSelector('canvas')).to.be.ok();
          });

          await annotationEditor.saveGroup();
        });

        it('recovers from missing field in data view', async () => {
          const assertShowingMissingFieldError = async (yes: boolean) => {
            const [failureExists, canvasExists] = await Promise.all([
              testSubjects.exists('embeddable-lens-failure'),
              find.existsByCssSelector('canvas', 1000),
            ]);
            expect(failureExists).to.be(yes);
            expect(canvasExists).to.be(!yes);
          };

          await contentList.clickItemByName('Group with additional fields');

          await assertShowingMissingFieldError(false);

          await retry.try(async () => {
            await annotationEditor.editGroupMetadata({
              dataView: 'Data view without fields',
            });

            await assertShowingMissingFieldError(true);
          });

          await retry.try(async () => {
            await annotationEditor.editGroupMetadata({
              dataView: 'logs*',
            });

            await assertShowingMissingFieldError(false);
          });
        });
      });
    });
  });
}
