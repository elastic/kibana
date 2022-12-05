/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { App } from '@kbn/core-application-browser';
import { BehaviorSubject } from 'rxjs';
import { CustomBrandingService } from './custom_branding_service';

describe('CustomBrandingService', () => {
  let service: CustomBrandingService;
  let mockAppService: any;

  beforeEach(() => {
    service = new CustomBrandingService();
    mockAppService = {
      applications$: new BehaviorSubject<ReadonlyMap<string, App>>({}),
    };
  });

  describe('#getCustomBranding$()', () => {
    it('only applies to enterprise license', () => {});
    it('#get', () => {});
    it('#set', () => {});
  });
});
