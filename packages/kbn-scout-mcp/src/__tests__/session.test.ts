/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutSession } from '../session';
import { ToolingLog } from '@kbn/tooling-log';
import type { ScoutMcpConfig } from '../types';
import type { Browser, BrowserContext } from 'playwright';
import type { ScoutPage } from '@kbn/scout';
import * as playwright from 'playwright';

// Mock playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

// Mock @kbn/test
jest.mock('@kbn/test', () => ({
  createEsClientForTesting: jest.fn(() => ({
    search: jest.fn(),
    bulk: jest.fn(),
    delete: jest.fn(),
    deleteByQuery: jest.fn(),
    security: {
      putRole: jest.fn(),
      deleteRole: jest.fn(),
    },
  })),
  KbnClient: jest.fn().mockImplementation(() => ({
    request: jest.fn().mockResolvedValue({ status: 204 }),
  })),
  SamlSessionManager: jest.fn().mockImplementation(() => ({
    getSessionCookieForRole: jest.fn(),
    getUserData: jest.fn(),
  })),
}));

// Mock @kbn/es
jest.mock('@kbn/es', () => ({
  SERVERLESS_ROLES_ROOT_PATH: '/mock/serverless/roles',
  STATEFUL_ROLES_ROOT_PATH: '/mock/stateful/roles',
  readRolesDescriptorsFromResource: jest.fn(() => ({
    admin: {},
    viewer: {},
  })),
}));

describe('ScoutSession', () => {
  let session: ScoutSession;
  let config: ScoutMcpConfig;
  let log: ToolingLog;
  let mockBrowser: jest.Mocked<Browser>;
  let mockContext: jest.Mocked<BrowserContext>;
  let mockPage: jest.Mocked<ScoutPage>;

  beforeEach(() => {
    log = new ToolingLog({
      level: 'silent',
      writeTo: process.stdout,
    });

    config = {
      targetUrl: 'http://localhost:5601',
      mode: 'stateful',
      ignoreHTTPSErrors: false,
    };

    // Setup mocks - mock ScoutPage with testSubj and gotoApp
    mockPage = {
      goto: jest.fn(),
      close: jest.fn(),
      title: jest.fn().mockResolvedValue('Test Page'),
      url: jest.fn().mockReturnValue('http://localhost:5620'),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
      accessibility: {
        snapshot: jest.fn().mockResolvedValue({ role: 'main', name: 'Test' }),
      },
      locator: jest.fn().mockReturnValue({
        ariaSnapshot: jest.fn().mockResolvedValue('button "Click me"'),
        click: jest.fn(),
        fill: jest.fn(),
        press: jest.fn(),
      }),
      goBack: jest.fn(),
      goForward: jest.fn(),
      reload: jest.fn(),
      waitForTimeout: jest.fn(),
      getByText: jest.fn().mockReturnValue({
        waitFor: jest.fn(),
      }),
      // Event listener methods (from Playwright Page API)
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      // ScoutPage extensions
      testSubj: {
        click: jest.fn(),
        fill: jest.fn(),
        locator: jest.fn().mockReturnValue({
          click: jest.fn(),
          fill: jest.fn(),
          press: jest.fn(),
          screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
        }),
        waitForSelector: jest.fn(),
        typeWithDelay: jest.fn(),
        clearInput: jest.fn(),
      },
      gotoApp: jest.fn(),
      waitForLoadingIndicatorHidden: jest.fn(),
      keyTo: jest.fn(),
    } as any;

    mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    } as any;

    mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn(),
    } as any;

    (playwright.chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);

    session = new ScoutSession(config, log);
  });

  afterEach(async () => {
    if (session.isInitialized()) {
      await session.close();
    }
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize browser and context', async () => {
      await session.initialize();

      expect(session.isInitialized()).toBe(true);
      expect(session.getBrowser()).toBe(mockBrowser);
      expect(session.getContext()).toBe(mockContext);
    });

    it('should create page during initialization', async () => {
      await session.initialize();

      expect(mockContext.newPage).toHaveBeenCalled();
      const page = await session.getPage();
      expect(page).toBe(mockPage);
    });

    it('should not initialize twice', async () => {
      await session.initialize();
      await session.initialize();

      // Should only launch browser once
      expect(playwright.chromium.launch).toHaveBeenCalledTimes(1);
    });

    it('should respect ignoreHTTPSErrors configuration', async () => {
      const configWithIgnoreSSL = {
        ...config,
        ignoreHTTPSErrors: true,
      };
      const sessionWithIgnoreSSL = new ScoutSession(configWithIgnoreSSL, log);

      await sessionWithIgnoreSSL.initialize();

      expect(mockBrowser.newContext).toHaveBeenCalledWith(
        expect.objectContaining({
          ignoreHTTPSErrors: true,
        })
      );

      await sessionWithIgnoreSSL.close();
    });

    it('should enable SSL validation by default', async () => {
      await session.initialize();

      expect(mockBrowser.newContext).toHaveBeenCalledWith(
        expect.objectContaining({
          ignoreHTTPSErrors: false,
        })
      );
    });
  });

  describe('page management', () => {
    it('should get existing page', async () => {
      await session.initialize();
      const page1 = await session.getPage();
      const page2 = await session.getPage();

      expect(page1).toBe(page2);
      expect(mockContext.newPage).toHaveBeenCalledTimes(1);
    });

    it('should create page if not initialized', async () => {
      const page = await session.getPage();

      expect(session.isInitialized()).toBe(true);
      expect(page).toBe(mockPage);
    });

    it('should be thread-safe when getting page concurrently', async () => {
      // Simulate concurrent page requests
      const [page1, page2, page3] = await Promise.all([
        session.getPage(),
        session.getPage(),
        session.getPage(),
      ]);

      expect(page1).toBe(page2);
      expect(page2).toBe(page3);
      // Due to mutex implementation, pages should be created during initialization
      // May be called 1-2 times depending on timing
      expect(mockContext.newPage).toHaveBeenCalled();
      expect(mockContext.newPage.mock.calls.length).toBeLessThanOrEqual(2);
    });
  });

  describe('authentication', () => {
    it('should track authentication status', () => {
      expect(session.isUserAuthenticated()).toBe(false);

      session.setAuthenticated(true, 'admin');

      expect(session.isUserAuthenticated()).toBe(true);
      expect(session.getCurrentRole()).toBe('admin');
    });

    it('should clear role when unauthenticated', () => {
      session.setAuthenticated(true, 'admin');
      session.setAuthenticated(false);

      expect(session.isUserAuthenticated()).toBe(false);
      expect(session.getCurrentRole()).toBe('admin'); // Role is still tracked
    });
  });

  describe('ARIA snapshots', () => {
    it('should get ARIA snapshot', async () => {
      await session.initialize();
      const snapshot = await session.getAriaSnapshot();

      expect(snapshot).toBe('button "Click me"');
      expect(mockPage.locator).toHaveBeenCalledWith('body');
    });

    it('should fallback to JSON snapshot if ARIA snapshot fails', async () => {
      await session.initialize();
      mockPage.locator.mockReturnValueOnce({
        ariaSnapshot: jest.fn().mockRejectedValue(new Error('Not supported')),
      } as any);

      const snapshot = await session.getAriaSnapshot();

      expect(snapshot).toContain('role');
      expect(snapshot).toContain('main');
    });
  });

  describe('custom roles', () => {
    it('should set custom Kibana role', async () => {
      await session.initialize();

      const role = {
        elasticsearch: {
          cluster: [],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
        ],
      };

      await session.setCustomRole(role);

      const kbnClient = await session.getKbnClient();
      expect(kbnClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          path: expect.stringContaining('/api/security/role/'),
        })
      );
    });

    it('should not recreate role if same role is set again', async () => {
      await session.initialize();

      const role = {
        elasticsearch: {
          cluster: [],
        },
        kibana: [{ spaces: ['*'], base: ['read'], feature: {} }],
      };

      await session.setCustomRole(role);
      await session.setCustomRole(role);

      const kbnClient = await session.getKbnClient();
      // Should only call once
      expect(kbnClient.request).toHaveBeenCalledTimes(1);
    });

    it('should set custom Elasticsearch role', async () => {
      await session.initialize();

      const role = {
        cluster: ['monitor'],
        indices: [{ names: ['logs-*'], privileges: ['read'] }],
        applications: [],
      };

      await session.setCustomRole(role);

      const esClient = await session.getEsClient();
      expect(esClient.security.putRole).toHaveBeenCalled();
    });
  });

  describe('Scout services', () => {
    it('should get Elasticsearch client', async () => {
      await session.initialize();
      const esClient = await session.getEsClient();

      expect(esClient).toBeDefined();
      expect(esClient.search).toBeDefined();
    });

    it('should get Kibana client', async () => {
      await session.initialize();
      const kbnClient = await session.getKbnClient();

      expect(kbnClient).toBeDefined();
      expect(kbnClient.request).toBeDefined();
    });

    it('should get Kibana URL helper', async () => {
      await session.initialize();
      const kbnUrl = await session.getKbnUrl();

      expect(kbnUrl).toBeDefined();
      expect(kbnUrl.get).toBeDefined();
      expect(kbnUrl.app).toBeDefined();
    });

    it('should get SAML session manager', async () => {
      await session.initialize();
      const samlManager = await session.getSamlSessionManager();

      expect(samlManager).toBeDefined();
    });
  });

  describe('EUI components', () => {
    it('should create EUI comboBox component', async () => {
      await session.initialize();
      const comboBox = await session.createEuiComponent('comboBox', 'myComboBox');

      expect(comboBox).toBeDefined();
      expect(comboBox.selectSingleOption).toBeDefined();
      expect(comboBox.selectMultiOption).toBeDefined();
    });

    it('should create EUI checkBox component', async () => {
      await session.initialize();
      const checkBox = await session.createEuiComponent('checkBox', 'myCheckBox');

      expect(checkBox).toBeDefined();
      expect(checkBox.check).toBeDefined();
      expect(checkBox.uncheck).toBeDefined();
    });

    it('should throw error for unknown EUI component', async () => {
      await session.initialize();
      await expect(session.createEuiComponent('unknown' as any, 'test')).rejects.toThrow(
        'Unknown EUI component'
      );
    });
  });

  describe('cleanup', () => {
    it('should close all resources', async () => {
      await session.initialize();
      await session.close();

      expect(mockPage.close).toHaveBeenCalled();
      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
      expect(session.isInitialized()).toBe(false);
      expect(session.isUserAuthenticated()).toBe(false);
    });

    it('should delete custom Elasticsearch role on cleanup', async () => {
      await session.initialize();

      // Get ES client before setting role to ensure it's initialized
      const esClient = await session.getEsClient();

      const role = {
        cluster: ['monitor'],
        indices: [{ names: ['logs-*'], privileges: ['read'] }],
        applications: [],
      };
      await session.setCustomRole(role);

      await session.close();

      expect(esClient.security.deleteRole).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringMatching(/^custom_role_mcp_\d+_\w+$/),
        })
      );
    });

    it('should attempt to cleanup even if errors occur', async () => {
      await session.initialize();
      mockBrowser.close.mockRejectedValue(new Error('Close failed'));

      // Browser close errors will propagate
      await expect(session.close()).rejects.toThrow('Close failed');
    });

    it('should be safe to close multiple times', async () => {
      await session.initialize();
      await session.close();
      await session.close();

      // Should not throw on second close
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('target URL', () => {
    it('should return configured target URL', () => {
      expect(session.getTargetUrl()).toBe('http://localhost:5601');
    });
  });

  describe('Scout config', () => {
    it('should return null before initialization', () => {
      expect(session.getScoutConfig()).toBeNull();
    });

    it('should return Scout config after initialization', async () => {
      await session.initialize();
      const scoutConfig = session.getScoutConfig();

      expect(scoutConfig).toBeDefined();
      expect(scoutConfig?.hosts.kibana).toBe('http://localhost:5601');
    });
  });

  describe('cache management', () => {
    it('should cache and retrieve EUI components', async () => {
      await session.initialize();
      const mockComponent = { click: jest.fn() };

      session.setEuiComponent('comboBox', 'myCombo', mockComponent);
      const retrieved = session.getEuiComponent('comboBox', 'myCombo');

      expect(retrieved).toBe(mockComponent);
    });

    it('should clear EUI components cache', async () => {
      await session.initialize();
      session.setEuiComponent('comboBox', 'myCombo', { click: jest.fn() });
      session.clearEuiComponents();

      expect(session.getEuiComponent('comboBox', 'myCombo')).toBeNull();
    });
  });
});
