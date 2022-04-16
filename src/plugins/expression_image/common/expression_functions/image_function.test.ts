/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { ExecutionContext } from '@kbn/expressions-plugin';
import {
  functionWrapper,
  getElasticLogo,
  getElasticOutline,
} from '@kbn/presentation-util-plugin/common/lib';
import { imageFunction as image } from './image_function';

describe('image', () => {
  const fn = functionWrapper(image);

  let elasticLogo: string;
  let elasticOutline: string;

  beforeEach(async () => {
    elasticLogo = (await getElasticLogo())?.elasticLogo;
    elasticOutline = (await getElasticOutline())?.elasticOutline;
  });

  it('returns an image object using a dataUrl', async () => {
    const result = await fn(
      null,
      { dataurl: elasticOutline, mode: 'cover' },
      {} as ExecutionContext
    );
    expect(result).to.have.property('type', 'image');
  });

  describe('args', () => {
    describe('dataurl', () => {
      it('sets the source of the image using dataurl', async () => {
        const result = await fn(null, { dataurl: elasticOutline }, {} as ExecutionContext);
        expect(result).to.have.property('dataurl', elasticOutline);
      });

      it.skip('sets the source of the image using url', async () => {
        // This is skipped because functionWrapper doesn't use the actual
        // interpreter and doesn't resolve aliases
        const result = await fn(null, { url: elasticOutline }, {} as ExecutionContext);
        expect(result).to.have.property('dataurl', elasticOutline);
      });

      it('defaults to the elasticLogo if not provided', async () => {
        const result = await fn(null, {}, {} as ExecutionContext);
        expect(result).to.have.property('dataurl', elasticLogo);
      });
    });

    describe('sets the mode', () => {
      it('to contain', async () => {
        const result = await fn(null, { mode: 'contain' }, {} as ExecutionContext);
        expect(result).to.have.property('mode', 'contain');
      });

      it('to cover', async () => {
        const result = await fn(null, { mode: 'cover' }, {} as ExecutionContext);
        expect(result).to.have.property('mode', 'cover');
      });

      it('to stretch', async () => {
        const result = await fn(null, { mode: 'stretch' }, {} as ExecutionContext);
        expect(result).to.have.property('mode', '100% 100%');
      });

      it("defaults to 'contain' if not provided", async () => {
        const result = await fn(null, {}, {} as ExecutionContext);
        expect(result).to.have.property('mode', 'contain');
      });
    });
  });
});
