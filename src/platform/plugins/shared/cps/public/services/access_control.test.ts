/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ProjectRoutingAccess } from '@kbn/cps-utils';
import { ACCESS_CONTROL_CONFIG, getProjectRoutingAccess } from './access_control';

describe('Access Control Configuration', () => {
  describe('getProjectRoutingAccess', () => {
    describe('with default configuration', () => {
      it('should return EDITABLE for dashboard view pages with hash only', () => {
        expect(getProjectRoutingAccess('dashboards', '#/view/my-dashboard')).toBe(
          ProjectRoutingAccess.EDITABLE
        );
      });

      it('should return EDITABLE for dashboard view pages with full path', () => {
        expect(getProjectRoutingAccess('dashboards', '/app/dashboards#/view/my-dashboard')).toBe(
          ProjectRoutingAccess.EDITABLE
        );
      });

      it('should return DISABLED for dashboard list page', () => {
        expect(getProjectRoutingAccess('dashboards', '#/list')).toBe(ProjectRoutingAccess.DISABLED);
      });

      it('should return EDITABLE for dashboard create page', () => {
        expect(getProjectRoutingAccess('dashboards', '#/create')).toBe(
          ProjectRoutingAccess.EDITABLE
        );
      });

      it('should return EDITABLE for discover', () => {
        expect(getProjectRoutingAccess('discover', '#/')).toBe(ProjectRoutingAccess.EDITABLE);
      });

      it('should return EDITABLE for visualize with Vega type', () => {
        expect(getProjectRoutingAccess('visualize', '#/edit/123?type:vega')).toBe(
          ProjectRoutingAccess.EDITABLE
        );
      });

      it('should return DISABLED for visualize without Vega type', () => {
        expect(getProjectRoutingAccess('visualize', '#/edit/123')).toBe(
          ProjectRoutingAccess.DISABLED
        );
      });

      it('should return EDITABLE for lens editor pages with full path', () => {
        expect(getProjectRoutingAccess('lens', '/app/lens#/edit/my-lens')).toBe(
          ProjectRoutingAccess.EDITABLE
        );
      });
      it('should return DISABLED for unknown apps', () => {
        expect(getProjectRoutingAccess('management', '#/')).toBe(ProjectRoutingAccess.DISABLED);
      });
    });

    describe('route rule priority', () => {
      it('should check rules in order and match pattern before defaulting', () => {
        // Rule matches: type:vega pattern -> EDITABLE (overrides DISABLED default)
        expect(getProjectRoutingAccess('visualize', '#/edit/123?type:vega')).toBe(
          ProjectRoutingAccess.EDITABLE
        );
        // No rule match: falls back to defaultAccess -> DISABLED
        expect(getProjectRoutingAccess('visualize', '#/edit/456?type:lens')).toBe(
          ProjectRoutingAccess.DISABLED
        );
        expect(getProjectRoutingAccess('visualize', '#/create')).toBe(
          ProjectRoutingAccess.DISABLED
        );
      });
    });
  });

  describe('ACCESS_CONTROL_CONFIG', () => {
    it('should have configuration for expected apps', () => {
      expect(ACCESS_CONTROL_CONFIG).toHaveProperty('dashboards');
      expect(ACCESS_CONTROL_CONFIG).toHaveProperty('discover');
      expect(ACCESS_CONTROL_CONFIG).toHaveProperty('visualize');
      expect(ACCESS_CONTROL_CONFIG).toHaveProperty('lens');
    });

    it('should have route rules for dashboards', () => {
      expect(ACCESS_CONTROL_CONFIG.dashboards.routeRules).toHaveLength(1);
    });
  });
});
