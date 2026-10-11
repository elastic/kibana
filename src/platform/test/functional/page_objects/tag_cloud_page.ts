/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

export class TagCloudPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly retry = this.ctx.getService('retry');
  private readonly visChart = this.ctx.getPageObject('visChart');

  public async selectTagCloudTag(tagDisplayText: string): Promise<void> {
    const targetElement = await this.retry.try(async () => {
      const elements = await this.find.allByCssSelector('text');
      for (const element of elements) {
        if ((await element.getVisibleText()) === tagDisplayText) {
          return element;
        }
      }
      throw new Error(`Tag cloud tag "${tagDisplayText}" is not present`);
    });
    const renderingCount = await this.visChart.getVisualizationRenderingCount();
    await targetElement.click();
    await this.visChart.waitForVisualizationRenderComplete(renderingCount + 1);
  }

  public async getTextTagByElement(
    webElement: WebElementWrapper,
    timeout?: number
  ): Promise<string[]> {
    const elements = await webElement.findAllByCssSelector('text', timeout);
    return await Promise.all(elements.map(async (element) => await element.getVisibleText()));
  }

  public async getTextTag() {
    const elements = await this.find.allByCssSelector('text');
    return await Promise.all(elements.map(async (element) => await element.getVisibleText()));
  }

  public async getTextSizes() {
    const tags = await this.find.allByCssSelector('text');
    async function returnTagSize(tag: WebElementWrapper) {
      const style = await tag.getAttribute('style');
      const fontSize = style?.match(/font-size: ([^;]*);/);
      return fontSize ? fontSize[1] : '';
    }
    return await Promise.all(tags.map(returnTagSize));
  }
}
