/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

export class AnnotationEditorPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');

  /**
   * Fills out group metadata
   */
  public async editGroupMetadata(metadata: {
    title?: string;
    description?: string;
    dataView?: string;
  }) {
    await this.testSubjects.existOrFail('annotationGroupTitle');

    if (metadata.title) {
      await this.setFlyoutFieldValue('annotationGroupTitle', metadata.title);
    }

    if (metadata.description) {
      await this.setFlyoutFieldValue('annotationGroupDescription', metadata.description);
    }

    if (metadata.dataView) {
      const dataView = metadata.dataView;
      await this.retry.try(async () => {
        await this.testSubjects.scrollIntoView('annotationDataViewSelection');
        await this.testSubjects.setValue('annotationDataViewSelection', dataView);
      });
    }
  }

  /**
   * Flyout fields can sit under the header on CI (1280x800); a raw click then
   * hits `euiFormRow__labelWrapper` instead of the input.
   */
  private async setFlyoutFieldValue(testSubj: string, value: string) {
    await this.retry.try(async () => {
      await this.testSubjects.scrollIntoView(testSubj);
      await this.testSubjects.setValue(testSubj, value, { clearWithKeyboard: true });
      const current = await this.testSubjects.getAttribute(testSubj, 'value');
      if (current !== value) {
        throw new Error(`Expected ${testSubj} to be "${value}" but was "${current}"`);
      }
    });
  }

  public async saveGroup() {
    await this.retry.try(async () => {
      await this.testSubjects.scrollIntoView('saveAnnotationGroup');
      await this.testSubjects.click('saveAnnotationGroup');
    });
  }

  public async getAnnotationCount() {
    const triggers = await this.testSubjects.findAll('lns-dimensionTrigger');
    return triggers.length;
  }

  public async openAnnotation() {
    await this.testSubjects.click('lns-dimensionTrigger');
  }

  public async configureAnnotation(config: {
    query: string;
    lineThickness: number;
    color: string;
  }) {
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail('lnsXY_annotation_query');
      await this.testSubjects.scrollIntoView('lnsXY_annotation_query');
      await this.testSubjects.click('lnsXY_annotation_query');
      await this.testSubjects.existOrFail('annotation-query-based-query-input');
    });

    const queryInput = await this.testSubjects.find('annotation-query-based-query-input');
    await queryInput.type(config.query);

    const titles = await this.testSubjects.findAll(`lnsDimensionEditorSectionHeading`);
    const lastTitle = titles[titles.length - 1];
    await lastTitle.click(); // close query input pop-up
    await lastTitle.focus(); // scroll down to the bottom of the section

    await this.testSubjects.setValue(
      'euiColorPickerAnchor indexPattern-dimension-colorPicker',
      config.color
    );
    await lastTitle.click(); // close color picker pop-up

    await this.testSubjects.setValue('lnsXYThickness', '' + config.lineThickness);

    await this.retry.waitFor('annotation editor UI to close', async () => {
      await this.testSubjects.click('backToGroupSettings');
      return !(await this.testSubjects.exists('backToGroupSettings'));
    });
  }

  public async addAnnotation(config: { query: string; lineThickness: number; color: string }) {
    await this.testSubjects.click('addAnnotation');
    await this.configureAnnotation(config);
  }

  public async removeAnnotation() {
    await this.testSubjects.click('indexPattern-dimension-remove');
  }

  public async showingMissingDataViewPrompt() {
    return await this.testSubjects.exists('missingDataViewPrompt');
  }
}
