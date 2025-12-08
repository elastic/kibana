/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ProjectRoutingAccess } from '@kbn/cps-utils';
import {
  getProjectRoutingAccess,
  getReadonlyMessage,
  DEFAULT_ACCESS_CONTROL_CONFIG,
  type AccessControlConfig,
} from './access_control';

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

      it('should return READONLY for lens editor pages with hash only', () => {
        expect(getProjectRoutingAccess('lens', '#/edit/my-lens')).toBe(
          ProjectRoutingAccess.READONLY
        );
      });

      it('should return READONLY for lens editor pages with full path', () => {
        expect(getProjectRoutingAccess('lens', '/app/lens#/edit/my-lens')).toBe(
          ProjectRoutingAccess.READONLY
        );
      });

      it('should return READONLY for lens listing page', () => {
        expect(getProjectRoutingAccess('lens', '#/')).toBe(ProjectRoutingAccess.READONLY);
      });

      it('should return DISABLED for unknown apps', () => {
        expect(getProjectRoutingAccess('management', '#/')).toBe(ProjectRoutingAccess.DISABLED);
      });
    });

    describe('with custom configuration', () => {
      const customConfig: AccessControlConfig = {
        myApp: {
          defaultAccess: ProjectRoutingAccess.EDITABLE,
        },
        customApp: {
          defaultAccess: ProjectRoutingAccess.DISABLED,
          routeRules: [
            {
              pattern: /^#\/special/,
              access: ProjectRoutingAccess.EDITABLE,
            },
          ],
        },
      };

      it('should use custom app configuration', () => {
        expect(getProjectRoutingAccess('myApp', '#/anything', customConfig)).toBe(
          ProjectRoutingAccess.EDITABLE
        );
      });

      it('should match route rules before defaultAccess', () => {
        expect(getProjectRoutingAccess('customApp', '#/special/page', customConfig)).toBe(
          ProjectRoutingAccess.EDITABLE
        );
        expect(getProjectRoutingAccess('customApp', '#/normal/page', customConfig)).toBe(
          ProjectRoutingAccess.DISABLED
        );
      });

      it('should return DISABLED for unconfigured apps', () => {
        expect(getProjectRoutingAccess('unknownApp', '#/', customConfig)).toBe(
          ProjectRoutingAccess.DISABLED
        );
      });
    });

    describe('route rule priority', () => {
      const config: AccessControlConfig = {
        testApp: {
          defaultAccess: ProjectRoutingAccess.DISABLED,
          routeRules: [
            {
              pattern: /^#\/admin/,
              access: ProjectRoutingAccess.READONLY,
            },
            {
              pattern: /^#\/edit/,
              access: ProjectRoutingAccess.EDITABLE,
            },
          ],
        },
      };

      it('should check rules in order', () => {
        expect(getProjectRoutingAccess('testApp', '#/admin/settings', config)).toBe(
          ProjectRoutingAccess.READONLY
        );
        expect(getProjectRoutingAccess('testApp', '#/edit/document', config)).toBe(
          ProjectRoutingAccess.EDITABLE
        );
        expect(getProjectRoutingAccess('testApp', '#/view/document', config)).toBe(
          ProjectRoutingAccess.DISABLED
        );
      });
    });
  });

  describe('getReadonlyMessage', () => {
    it('should return custom message from default config for lens', () => {
      expect(getReadonlyMessage('lens')).toBe(
        'Please adjust project scope for each layer in the Lens editor.'
      );
    });

    it('should return undefined for apps without custom message', () => {
      expect(getReadonlyMessage('dashboards')).toBeUndefined();
    });

    it('should return custom message from custom config', () => {
      const config: AccessControlConfig = {
        myApp: {
          defaultAccess: ProjectRoutingAccess.READONLY,
          readonlyMessage: 'Custom message here',
        },
      };

      expect(getReadonlyMessage('myApp', config)).toBe('Custom message here');
    });

    it('should return undefined for unconfigured apps', () => {
      const config: AccessControlConfig = {};
      expect(getReadonlyMessage('unknownApp', config)).toBeUndefined();
    });
  });

  describe('DEFAULT_ACCESS_CONTROL_CONFIG', () => {
    it('should have configuration for expected apps', () => {
      expect(DEFAULT_ACCESS_CONTROL_CONFIG).toHaveProperty('dashboards');
      expect(DEFAULT_ACCESS_CONTROL_CONFIG).toHaveProperty('discover');
      expect(DEFAULT_ACCESS_CONTROL_CONFIG).toHaveProperty('visualize');
      expect(DEFAULT_ACCESS_CONTROL_CONFIG).toHaveProperty('lens');
    });

    it('should have route rules for dashboards', () => {
      expect(DEFAULT_ACCESS_CONTROL_CONFIG.dashboards.routeRules).toHaveLength(1);
    });

    it('should have readonly message for lens', () => {
      expect(DEFAULT_ACCESS_CONTROL_CONFIG.lens.readonlyMessage).toBeDefined();
    });
  });
});
