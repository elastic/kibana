/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class IndexEditorObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');
  private readonly common = this.ctx.getPageObject('common');
  private readonly browser = this.ctx.getService('browser');
  private readonly dataGrid = this.ctx.getService('dataGrid');
  private readonly es = this.ctx.getService('es');

  public async getColumnNames(): Promise<string[]> {
    const columnHeaders = await this.testSubjects.findAll('columnNameButton');

    const columnNames: string[] = [];

    await this.retry.try(async () => {
      for (const columnHeader of columnHeaders) {
        const name = await columnHeader.getVisibleText();
        expect(name).to.not.be.empty();
        columnNames.push(name);
      }
    });

    return columnNames;
  }

  public async setColumnName(name: string, columnIndex: number) {
    const columnHeaders = await this.testSubjects.findAll('columnNameButton');
    const columnHeader = columnHeaders[columnIndex];

    expect(columnHeader).to.not.be(undefined);

    await columnHeader.click();
    await this.testSubjects.setValue('columnNameInput', name);
    await this.common.pressEnterKey();
  }

  public async addColumn(): Promise<void> {
    await this.testSubjects.click('addColumnButton');
  }

  public async deleteColumn(name: string): Promise<void> {
    await this.dataGrid.openColMenuByField(name);
    await this.testSubjects.click('deleteColumnButton');
  }

  public async setCellValue(rowIndex: number, columnIndex: number, value: string): Promise<void> {
    await this.testSubjects.click(`indexEditorCellValue-${rowIndex}-${columnIndex}`);
    await this.testSubjects.setValue('cellValueInput', value);
    await this.common.pressEnterKey();
  }

  public async addRow(): Promise<void> {
    await this.testSubjects.click('addRowButton');
  }

  public async saveChanges(): Promise<void> {
    await this.testSubjects.click('indexEditorSaveChangesButton');
    await this.testSubjects.waitForDeleted('lookupIndexFlyout');
  }

  public async verifyIndexContent(
    indexName: string,
    expectedDocs: Record<string, unknown>[]
  ): Promise<void> {
    const indexContent = await this.es.search({
      index: indexName,
    });

    expect(indexContent.hits.hits.length).to.be(expectedDocs.length);

    const docs = indexContent.hits.hits.map((hit) => hit._source);
    expect(docs).to.eql(expectedDocs);
  }

  public async uploadFile(filePath: string): Promise<void> {
    const fileInput = await this.testSubjects.find('indexEditorFileInput');
    await fileInput.type(filePath);
  }
}
