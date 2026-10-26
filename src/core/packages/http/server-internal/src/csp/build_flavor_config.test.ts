/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBuildFlavorCspConfig } from './build_flavor_config';
import { cspConfig } from './config';
import { CspConfig } from './csp_config';

describe('getBuildFlavorCspConfig', () => {
  const noConfig = cspConfig.schema.validate({});

  it('returns nothing for serverless', () => {
    expect(getBuildFlavorCspConfig('serverless', noConfig)).toEqual({});
  });

  it('returns the enforced img-src, font-src and media-src sources for traditional', () => {
    expect(getBuildFlavorCspConfig('traditional', noConfig)).toEqual({
      font_src: ['data:'],
      img_src: ['data:', 'blob:', 'https:', 'http:'],
      media_src: [`'self'`, 'kibana.estccdn.com'],
    });
  });

  it('skips the img-src defaults when csp.img_src is configured', () => {
    const configured = cspConfig.schema.validate({ img_src: ['logos.example.test'] });

    expect(getBuildFlavorCspConfig('traditional', configured)).toEqual({
      font_src: ['data:'],
      img_src: [],
      media_src: [`'self'`, 'kibana.estccdn.com'],
    });
  });

  describe('applied to CspConfig', () => {
    it('leaves the serverless headers unchanged', () => {
      const withFlavor = new CspConfig(noConfig, getBuildFlavorCspConfig('serverless', noConfig));

      expect(withFlavor.header).toEqual(CspConfig.DEFAULT.header);
      expect(withFlavor.reportOnlyHeader).toEqual(CspConfig.DEFAULT.reportOnlyHeader);
    });

    it('enforces the three directives on traditional and mirrors them into report-only', () => {
      const { header, reportOnlyHeader } = new CspConfig(
        noConfig,
        getBuildFlavorCspConfig('traditional', noConfig)
      );

      expect(header).toMatchInlineSnapshot(
        `"script-src 'report-sample' 'self'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'; object-src 'report-sample' 'none'; form-action 'report-sample' 'self'; frame-src 'report-sample' 'self' kibana.estccdn.com play.vidyard.com videos.elastic.co ela.st; font-src 'self' data:; img-src 'self' data: blob: https: http:; media-src 'self' kibana.estccdn.com"`
      );
      expect(reportOnlyHeader).toMatchInlineSnapshot(
        `"default-src 'report-sample' 'none'; font-src 'report-sample' 'self' data:; img-src 'report-sample' 'self' data: tiles.maps.elastic.co blob: https: http:; connect-src 'report-sample' 'self' telemetry.elastic.co telemetry-staging.elastic.co feeds.elastic.co tiles.maps.elastic.co vector.maps.elastic.co; script-src 'report-sample' 'self'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'; object-src 'report-sample' 'none'; frame-src 'report-sample' 'self' kibana.estccdn.com play.vidyard.com videos.elastic.co ela.st; media-src 'self' kibana.estccdn.com"`
      );
    });

    it('appends font-src and media-src to values set through csp.* and keeps a configured img-src', () => {
      const configured = cspConfig.schema.validate({
        img_src: ['logos.example.test'],
        font_src: ['fonts.example.test'],
        media_src: ['media.example.test'],
      });
      const { header } = new CspConfig(
        configured,
        getBuildFlavorCspConfig('traditional', configured)
      );

      expect(header).toContain(`img-src 'self' logos.example.test;`);
      expect(header).toContain(`font-src 'self' fonts.example.test data:`);
      expect(header).toContain(`media-src media.example.test 'self' kibana.estccdn.com`);
    });
  });
});
