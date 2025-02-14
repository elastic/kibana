/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

export class ESQLService extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly monacoEditor = this.ctx.getService('monacoEditor');

  /** Ensures that the ES|QL code editor is loaded with a given statement */
  public async expectEsqlStatement(statement: string) {
    const codeEditor = await this.testSubjects.find('ESQLEditor');
    expect(await codeEditor.getAttribute('innerText')).to.contain(statement);
  }

  public async isQueryPresentInTable(query: string, items: string[][]) {
    const queryAdded = items.some((item) => {
      return item[2] === query;
    });

    expect(queryAdded).to.be(true);
  }

  public async getHistoryItems(): Promise<string[][]> {
    const queryHistory = await this.testSubjects.find('ESQLEditor-queryHistory');
    const tableItems = await this.getStarredHistoryTableItems(queryHistory);
    return tableItems;
  }

  public async getStarredItems(): Promise<string[][]> {
    const starredQueries = await this.testSubjects.find('ESQLEditor-starredQueries');
    const tableItems = await this.getStarredHistoryTableItems(starredQueries);
    return tableItems;
  }

  private async getStarredHistoryTableItems(element: WebElementWrapper): Promise<string[][]> {
    const tableBody = await this.retry.try(async () => element.findByTagName('tbody'));
    const $ = await tableBody.parseDomContent();
    return $('tr')
      .toArray()
      .map((tr) => {
        return $(tr)
          .find('td')
          .toArray()
          .map((cell) => {
            // if this is an EUI table, filter down to the specific cell content
            // otherwise this will include mobile-specific header information
            const euiTableCellContent = $(cell).find('.euiTableCellContent');

            if (euiTableCellContent.length > 0) {
              return $(cell).find('.euiTableCellContent').text().trim();
            } else {
              return $(cell).text().trim();
            }
          });
      });
  }

  public async getStarredItem(rowIndex = 0) {
    const queryHistory = await this.testSubjects.find('ESQLEditor-starredQueries');
    const tableBody = await this.retry.try(async () => queryHistory.findByTagName('tbody'));
    const rows = await this.retry.try(async () => tableBody.findAllByTagName('tr'));

    return rows[rowIndex];
  }

  public async clickStarredItem(rowIndex = 0) {
    const row = await this.getStarredItem(rowIndex);
    const toggle = await row.findByTestSubject('ESQLEditor-history-starred-queries-run-button');
    await toggle.click();
  }

  public async getHistoryItem(rowIndex = 0) {
    const queryHistory = await this.testSubjects.find('ESQLEditor-queryHistory');
    const tableBody = await this.retry.try(async () => queryHistory.findByTagName('tbody'));
    const rows = await this.retry.try(async () => tableBody.findAllByTagName('tr'));

    return rows[rowIndex];
  }

  public async clickHistoryItem(rowIndex = 0) {
    const row = await this.getHistoryItem(rowIndex);
    const toggle = await row.findByTestSubject('ESQLEditor-history-starred-queries-run-button');
    await toggle.click();
  }

  public async openHelpMenu() {
    await this.testSubjects.click('esql-menu-button');
    await this.retry.waitFor('popover to appear', async () => {
      return await this.testSubjects.exists('esql-quick-reference');
    });
  }

  public async isOpenQuickReferenceFlyout() {
    return await this.testSubjects.exists('esqlInlineDocumentationFlyout');
  }

  public async openQuickReferenceFlyout() {
    await this.openHelpMenu();
    await this.testSubjects.click('esql-quick-reference');
    await this.retry.waitFor('quick reference to appear', async () => {
      return await this.isOpenQuickReferenceFlyout();
    });
  }

  public async waitESQLEditorLoaded(editorSubjId = 'ESQLEditor') {
    await this.monacoEditor.waitCodeEditorReady(editorSubjId);
  }

  public async getEsqlEditorQuery() {
    return await this.monacoEditor.getCodeEditorValue();
  }

  public async setEsqlEditorQuery(query: string) {
    await this.monacoEditor.setCodeEditorValue(query);
  }

  public async typeEsqlEditorQuery(query: string, editorSubjId = 'ESQLEditor') {
    await this.setEsqlEditorQuery(''); // clear the default query
    await this.monacoEditor.typeCodeEditorValue(query, editorSubjId);
  }
}
