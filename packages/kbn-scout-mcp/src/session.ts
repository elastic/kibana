/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'path';
import { URL } from 'url';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Mutex } from 'async-mutex';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  ScoutTestConfig,
  KibanaRole,
  ElasticsearchRoleDescriptor,
  ScoutPage,
} from '@kbn/scout';
import type { SamlSessionManager, HostOptions } from '@kbn/test';
import {
  SamlSessionManager as SamlSessionManagerClass,
  createEsClientForTesting,
  KbnClient,
} from '@kbn/test';
import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  SERVERLESS_ROLES_ROOT_PATH,
  STATEFUL_ROLES_ROOT_PATH,
  readRolesDescriptorsFromResource,
} from '@kbn/es';
import { subj } from '@kbn/test-subj-selector';
import { REPO_ROOT } from '@kbn/repo-info';
import { createScoutTestConfig } from './config';
import type { ScoutMcpConfig } from './types';

/**
 * PathOptions interface matching Scout's KibanaUrl
 */
interface PathOptions {
  /**
   * Additional path segment to append to the app path
   */
  path?: string;
  /**
   * Query string parameters
   */
  params?: Record<string, string>;
  /**
   * The hash value of the URL
   */
  hash?: string;
}

/**
 * Kibana URL helper - simplified version of Scout's KibanaUrl
 * Using a simple object instead of class to avoid "too many classes" lint error
 * This matches the interface Scout expects for KibanaUrl
 */
function createKibanaUrlHelper(baseUrl: URL) {
  return {
    get(rel?: string, options?: PathOptions): string {
      const url = new URL(rel ?? '/', baseUrl);

      if (options?.params) {
        for (const [key, value] of Object.entries(options.params)) {
          url.searchParams.set(key, value);
        }
      }

      if (options?.hash !== undefined) {
        url.hash = options.hash;
      }

      return url.href;
    },
    domain(): string {
      return baseUrl.hostname;
    },
    app(appName: string, options?: { space?: string; pathOptions?: PathOptions }): string {
      const spacePath = options?.space ? `s/${options.space}` : '';
      const appPath = `${spacePath}/app/${appName}`;

      // Build the full path including any additional path segment
      let fullPath = appPath;
      if (options?.pathOptions?.path) {
        const additionalPath = options.pathOptions.path;
        fullPath = `${appPath}${additionalPath.startsWith('/') ? '' : '/'}${additionalPath}`;
      }

      // Extract params and hash for this.get(), excluding path
      const { path: _, ...restOptions } = options?.pathOptions || {};
      return this.get(fullPath, restOptions);
    },
    toString(): string {
      return baseUrl.href;
    },
  };
}

/**
 * Extend Playwright Page with Scout functionality
 * This replicates Scout's extendPlaywrightPage function for MCP usage
 */
function extendPageWithScoutHelpers(
  page: Page,
  kbnUrl: ReturnType<typeof createKibanaUrlHelper>
): ScoutPage {
  const scoutPage = page as ScoutPage;

  // Helper to create testSubj methods
  const createTestSubjMethod = (methodName: keyof Page) => {
    return (...args: any[]) => {
      const selector = args[0];
      const testSubjSelector = subj(selector);
      return (page[methodName] as Function)(testSubjSelector, ...args.slice(1));
    };
  };

  // Create testSubj object with all the methods
  scoutPage.testSubj = {
    check: createTestSubjMethod('check'),
    click: createTestSubjMethod('click'),
    dblclick: createTestSubjMethod('dblclick'),
    fill: createTestSubjMethod('fill'),
    focus: createTestSubjMethod('focus'),
    getAttribute: createTestSubjMethod('getAttribute'),
    hover: createTestSubjMethod('hover'),
    innerText: createTestSubjMethod('innerText'),
    isEnabled: createTestSubjMethod('isEnabled'),
    isChecked: createTestSubjMethod('isChecked'),
    isHidden: createTestSubjMethod('isHidden'),
    isVisible: createTestSubjMethod('isVisible'),
    locator: createTestSubjMethod('locator'),
    waitForSelector: createTestSubjMethod('waitForSelector'),

    // Custom methods
    typeWithDelay: async (selector: string, text: string, options?: { delay: number }) => {
      const { delay = 25 } = options || {};
      const testSubjSelector = subj(selector);
      await page.locator(testSubjSelector).click();
      for (const char of text) {
        await page.keyboard.insertText(char);
        await page.waitForTimeout(delay);
      }
    },

    clearInput: async (selector: string) => {
      const testSubjSelector = subj(selector);
      await page.locator(testSubjSelector).fill('');
    },
  };

  // Add gotoApp method - matches Scout's signature
  scoutPage.gotoApp = (
    appName: string,
    pathOptions?: { params?: Record<string, string>; hash?: string }
  ) => {
    return page.goto(kbnUrl.app(appName, { pathOptions }));
  };

  // Add waitForLoadingIndicatorHidden method
  scoutPage.waitForLoadingIndicatorHidden = () => {
    return scoutPage.testSubj.waitForSelector('globalLoadingIndicator-hidden', {
      state: 'attached',
    });
  };

  // Add keyTo method (simplified - could be enhanced)
  scoutPage.keyTo = async (selector: string, key: string, maxElementsToTraverse: number = 1000) => {
    // Simplified implementation - Scout has a more complex version
    const locator = page.locator(selector);
    let attempts = 0;
    while (attempts < maxElementsToTraverse) {
      const focused = await locator.evaluate((el) => document.activeElement === el);
      if (focused) return;
      await page.keyboard.press(key);
      attempts++;
    }
    throw new Error(`Could not navigate to element with selector: ${selector}`);
  };

  return scoutPage;
}

/**
 * Create a custom Kibana role
 */
async function createCustomRole(
  kbnClient: KbnClient,
  customRoleName: string,
  role: KibanaRole
): Promise<void> {
  const { status } = await kbnClient.request({
    method: 'PUT',
    path: `/api/security/role/${customRoleName}`,
    body: role,
  });

  if (status !== 204) {
    throw new Error(`Failed to set custom role with status: ${status}`);
  }
}

/**
 * Create a custom Elasticsearch role
 */
async function createElasticsearchCustomRole(
  client: EsClient,
  customRoleName: string,
  role: ElasticsearchRoleDescriptor
): Promise<void> {
  await client.security.putRole({
    name: customRoleName,
    ...role,
  });
}

/**
 * Helper to resolve selector to ScoutPage locator
 */
function resolveEuiSelector(
  scoutPage: ScoutPage,
  selector: string | { dataTestSubj?: string; locator?: string }
) {
  if (typeof selector === 'string') {
    return scoutPage.testSubj.locator(selector);
  }
  if (selector.dataTestSubj) {
    return scoutPage.testSubj.locator(selector.dataTestSubj);
  }
  return scoutPage.locator(selector.locator!);
}

/**
 * Simplified EUI component wrappers that work with ScoutPage
 * Using factory functions instead of classes to avoid "too many classes" lint error
 */
function createSimplifiedEuiComboBoxWrapper(
  scoutPage: ScoutPage,
  selector: string | { dataTestSubj?: string; locator?: string }
) {
  const getLocator = () => resolveEuiSelector(scoutPage, selector);

  return {
    async selectSingleOption(value: string) {
      const locator = getLocator();
      await locator.locator(subj('comboBoxInput')).click();
      await locator.locator(subj('comboBoxSearchInput')).fill(value);
      await scoutPage.locator(`[title="${value}"]`).click();
    },
    async selectMultiOption(value: string) {
      const locator = getLocator();
      await locator.locator(subj('comboBoxInput')).click();
      await locator.locator(subj('comboBoxSearchInput')).fill(value);
      await scoutPage.locator(`[title="${value}"]`).click();
    },
    async clear() {
      const locator = getLocator();
      await locator.locator(subj('comboBoxClearButton')).click();
    },
  };
}

function createSimplifiedEuiCheckBoxWrapper(
  scoutPage: ScoutPage,
  selector: string | { dataTestSubj?: string; locator?: string }
) {
  const getLocator = () => resolveEuiSelector(scoutPage, selector);

  return {
    async check() {
      await getLocator().locator('input.euiCheckbox__input').check();
    },
    async uncheck() {
      await getLocator().locator('input.euiCheckbox__input').uncheck();
    },
    async isChecked(): Promise<boolean> {
      return await getLocator().locator('input.euiCheckbox__input').isChecked();
    },
  };
}

function createSimplifiedEuiDataGridWrapper(
  scoutPage: ScoutPage,
  selector: string | { dataTestSubj?: string; locator?: string }
) {
  const getLocator = () => resolveEuiSelector(scoutPage, selector);

  return {
    async getRowCount(): Promise<number> {
      return await getLocator().locator('[role="row"]').count();
    },
    async getColumnCount(): Promise<number> {
      const firstRow = getLocator().locator('[role="row"]').first();
      return await firstRow.locator('[role="gridcell"]').count();
    },
    async getCellValue(row: number, column: number): Promise<string> {
      const rows = getLocator().locator('[role="row"]');
      const cell = rows.nth(row).locator('[role="gridcell"]').nth(column);
      return await cell.innerText();
    },
    async clickCell(row: number, column: number) {
      const rows = getLocator().locator('[role="row"]');
      await rows.nth(row).locator('[role="gridcell"]').nth(column).click();
    },
  };
}

function createSimplifiedEuiSelectableWrapper(
  scoutPage: ScoutPage,
  selector: string | { dataTestSubj?: string; locator?: string }
) {
  const getLocator = () => resolveEuiSelector(scoutPage, selector);

  return {
    async selectOption(value: string) {
      const locator = getLocator();
      await locator.locator('.euiFieldSearch').fill(value);
      await locator.locator(`li[role="option"]:has-text("${value}")`).click();
    },
    async getSelectedOptions(): Promise<string[]> {
      const locator = getLocator();
      const selected = locator.locator('li[role="option"][aria-checked="true"]');
      const count = await selected.count();
      const options: string[] = [];
      for (let i = 0; i < count; i++) {
        const text = await selected.nth(i).innerText();
        options.push(text);
      }
      return options;
    },
  };
}

/**
 * Manages the Scout session including browser context and EUI components
 */
export class ScoutSession {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private currentPage: ScoutPage | null = null;
  private euiComponentsCache: Map<string, any> = new Map();
  private isAuthenticated: boolean = false;
  private currentRole: string | null = null;
  private scoutConfig: ScoutTestConfig | null = null;
  private samlSessionManager: SamlSessionManager | null = null;
  private esClient: EsClient | null = null;
  private kbnClient: KbnClient | null = null;
  private kbnUrl: any = null;

  // Custom role management - generate unique names to avoid conflicts
  private customRoleName: string = '';
  private customRoleHash: string = '';
  private activeCustomRoles: Set<string> = new Set();

  // Session caching - track which roles we've authenticated with
  private roleSessionCache: Map<string, { timestamp: number; cookieHash: string }> = new Map();
  private supportedRoles: string[] = [];

  // Tracking for test generation and debugging
  private consoleLogs: Array<{ type: string; text: string; timestamp: number }> = [];
  private networkActivity: Array<{
    url: string;
    method: string;
    status: number;
    timestamp: number;
  }> = [];
  private actionHistory: Array<{
    type: string;
    timestamp: number;
    [key: string]: any;
  }> = [];

  // Mutex for thread-safe operations
  private readonly mutex = new Mutex();
  private readonly initMutex = new Mutex();

  constructor(private readonly config: ScoutMcpConfig, private readonly log: ToolingLog) {}

  /**
   * Initialize Scout configuration and clients
   */
  private async initializeScoutServices(): Promise<void> {
    if (this.scoutConfig) {
      return; // Already initialized
    }

    this.log.info('Initializing Scout services...');

    // Create or load Scout config
    this.scoutConfig = createScoutTestConfig(this.config, this.log);

    // Initialize clients using @kbn/test directly
    this.esClient = this.createEsClient(this.scoutConfig);
    this.kbnClient = this.createKbnClient(this.scoutConfig);
    this.kbnUrl = this.createKbnUrl(this.scoutConfig);

    // Initialize SAML session manager
    this.samlSessionManager = this.createSamlSessionManager(this.scoutConfig, this.customRoleName);

    this.log.success('Scout services initialized');
  }

  /**
   * Create Elasticsearch client using @kbn/test directly
   */
  private createEsClient(config: ScoutTestConfig): EsClient {
    const { username, password } = config.auth;
    const elasticsearchUrl = new URL(config.hosts.elasticsearch);
    elasticsearchUrl.username = username;
    elasticsearchUrl.password = password;

    return createEsClientForTesting({
      esUrl: elasticsearchUrl.toString(),
      isCloud: config.isCloud,
      authOverride: { username, password },
    });
  }

  /**
   * Create Kibana client using @kbn/test directly
   */
  private createKbnClient(config: ScoutTestConfig): KbnClient {
    const kibanaUrl = new URL(config.hosts.kibana);
    kibanaUrl.username = config.auth.username;
    kibanaUrl.password = config.auth.password;

    return new KbnClient({ log: this.log, url: kibanaUrl.toString() });
  }

  /**
   * Create Kibana URL helper
   */
  private createKbnUrl(config: ScoutTestConfig): any {
    return createKibanaUrlHelper(new URL(config.hosts.kibana));
  }

  /**
   * Create SAML session manager using @kbn/test directly
   */
  private createSamlSessionManager(
    config: ScoutTestConfig,
    customRoleName?: string
  ): SamlSessionManager {
    if (config.serverless && !config.projectType) {
      throw new Error(
        'Project type is required for serverless mode. Please set SCOUT_PROJECT_TYPE environment variable or --project-type option.'
      );
    }

    const resourceDirPath = config.serverless
      ? path.resolve(SERVERLESS_ROLES_ROOT_PATH, config.projectType!)
      : path.resolve(REPO_ROOT, STATEFUL_ROLES_ROOT_PATH);

    const rolesDefinitionPath = path.resolve(resourceDirPath, 'roles.yml');
    const supportedRoleDescriptors = readRolesDescriptorsFromResource(
      rolesDefinitionPath
    ) as Record<string, unknown>;

    // Store supported roles for validation
    this.supportedRoles = Object.keys(supportedRoleDescriptors);

    const supportedRolesWithCustom = [...this.supportedRoles].concat(customRoleName || []);

    const kibanaUrl = new URL(config.hosts.kibana);
    kibanaUrl.username = config.auth.username;
    kibanaUrl.password = config.auth.password;

    // Extract base path from the URL pathname
    // Remove trailing slash if present, treat empty or "/" as no base path
    const pathname = kibanaUrl.pathname.replace(/\/$/, '').trim();
    const basePath = pathname && pathname !== '/' ? pathname : undefined;

    const hostOptions: HostOptions = {
      protocol: kibanaUrl.protocol.replace(':', '') as 'http' | 'https',
      hostname: kibanaUrl.hostname,
      port: Number(kibanaUrl.port) || (kibanaUrl.protocol === 'https:' ? 443 : 80),
      username: kibanaUrl.username,
      password: kibanaUrl.password,
    };

    return new SamlSessionManagerClass({
      hostOptions,
      log: this.log,
      isCloud: config.isCloud,
      cloudHostName: config.cloudHostName,
      supportedRoles: {
        roles: supportedRolesWithCustom,
        sourcePath: rolesDefinitionPath,
      },
      cloudUsersFilePath: config.cloudUsersFilePath,
      basePath,
    });
  }

  /**
   * Get the SAML session manager
   */
  async getSamlSessionManager(): Promise<SamlSessionManager> {
    await this.initializeScoutServices();
    if (!this.samlSessionManager) {
      throw new Error('SAML session manager not initialized');
    }
    return this.samlSessionManager;
  }

  /**
   * Get Elasticsearch client
   */
  async getEsClient(): Promise<EsClient> {
    await this.initializeScoutServices();
    if (!this.esClient) {
      throw new Error('Elasticsearch client not initialized');
    }
    return this.esClient;
  }

  /**
   * Get Kibana client
   */
  async getKbnClient(): Promise<KbnClient> {
    await this.initializeScoutServices();
    if (!this.kbnClient) {
      throw new Error('Kibana client not initialized');
    }
    return this.kbnClient;
  }

  /**
   * Get Kibana URL helper
   */
  async getKbnUrl(): Promise<any> {
    await this.initializeScoutServices();
    if (!this.kbnUrl) {
      throw new Error('Kibana URL helper not initialized');
    }
    return this.kbnUrl;
  }

  /**
   * Get Scout config
   */
  getScoutConfig(): ScoutTestConfig | null {
    return this.scoutConfig;
  }

  /**
   * Get target URL (base URL for Kibana)
   */
  getTargetUrl(): string {
    return this.config.targetUrl;
  }

  /**
   * Set a custom role for authentication
   */
  async setCustomRole(role: KibanaRole | ElasticsearchRoleDescriptor): Promise<void> {
    await this.initializeScoutServices();

    const newRoleHash = JSON.stringify(role);

    // If the role definition is the same, reuse the existing custom role
    if (this.customRoleHash === newRoleHash && this.customRoleName) {
      this.log.debug('Custom role with same definition already exists, reusing it');
      return;
    }

    // Cleanup previous custom role if switching to a new one
    if (this.customRoleName && this.customRoleHash !== newRoleHash) {
      await this.cleanupCustomRole(this.customRoleName);
    }

    // Generate a unique custom role name
    this.customRoleName = this.generateUniqueCustomRoleName();

    const isElasticsearchRole = (r: any): r is ElasticsearchRoleDescriptor => {
      return 'applications' in r;
    };

    if (isElasticsearchRole(role)) {
      await createElasticsearchCustomRole(await this.getEsClient(), this.customRoleName, role);
    } else {
      await createCustomRole(await this.getKbnClient(), this.customRoleName, role);
    }

    // Track the active custom role
    this.activeCustomRoles.add(this.customRoleName);
    this.customRoleHash = newRoleHash;

    this.log.debug(`Created custom role: ${this.customRoleName}`);
  }

  /**
   * Get custom role name
   */
  getCustomRoleName(): string {
    return this.customRoleName;
  }

  /**
   * Generate a unique custom role name to avoid conflicts
   */
  private generateUniqueCustomRoleName(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `custom_role_mcp_${timestamp}_${random}`;
  }

  /**
   * Validate that a role exists in the supported roles list
   */
  validateRole(role: string): { valid: boolean; error?: string } {
    if (!this.supportedRoles || this.supportedRoles.length === 0) {
      return {
        valid: false,
        error: 'Supported roles not loaded. Ensure Scout services are initialized.',
      };
    }

    // Custom roles are always valid if they match our pattern
    if (role.startsWith('custom_role_mcp_')) {
      return { valid: true };
    }

    if (!this.supportedRoles.includes(role)) {
      return {
        valid: false,
        error: `Role '${role}' is not supported. Available roles: ${this.supportedRoles.join(
          ', '
        )}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get list of supported roles
   */
  getSupportedRoles(): string[] {
    return [...this.supportedRoles];
  }

  /**
   * Cleanup a specific custom role
   */
  async cleanupCustomRole(roleName: string): Promise<void> {
    if (!this.esClient) {
      return;
    }

    try {
      this.log.debug(`Deleting custom role: ${roleName}`);
      await this.esClient.security.deleteRole({ name: roleName });
      this.activeCustomRoles.delete(roleName);
    } catch (error) {
      this.log.debug(`Failed to delete custom role ${roleName}: ${error}`);
    }
  }

  /**
   * Initialize the browser and context
   * Thread-safe: Uses initMutex to prevent concurrent initialization
   */
  async initialize(): Promise<void> {
    return await this.initMutex.runExclusive(async () => {
      // Check again inside the lock in case another call initialized it
      if (this.browser && this.context) {
        this.log.debug('Session already initialized, skipping');
        return;
      }

      this.log.info('Initializing Scout session...');

      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      // SSL validation: enabled by default, can be disabled for localhost/development
      const ignoreHTTPSErrors = this.config.ignoreHTTPSErrors ?? false;

      if (ignoreHTTPSErrors) {
        this.log.warning(
          'SSL certificate validation is disabled. This should only be used for localhost/development environments.'
        );
      }

      this.context = await this.browser.newContext({
        baseURL: this.config.targetUrl,
        ignoreHTTPSErrors,
      });

      const page = await this.context.newPage();

      // Initialize Scout services for authentication
      await this.initializeScoutServices();

      // Setup console and network listeners
      this.setupPageListeners(page);

      // Extend page with Scout functionality
      const kbnUrl = await this.getKbnUrl();
      this.currentPage = extendPageWithScoutHelpers(page, kbnUrl);

      this.log.success('Scout session initialized');
    });
  }

  /**
   * Get the current ScoutPage, creating one if needed
   * Thread-safe: Uses mutex to prevent race conditions
   */
  async getPage(): Promise<ScoutPage> {
    return await this.mutex.runExclusive(async () => {
      if (!this.currentPage) {
        if (!this.context) {
          await this.initialize();
        } else {
          // If context exists but page doesn't, create and extend it
          this.log.debug('Creating new page...');
          const page = await this.context.newPage();
          // Setup console and network listeners
          this.setupPageListeners(page);
          const kbnUrl = await this.getKbnUrl();
          this.currentPage = extendPageWithScoutHelpers(page, kbnUrl);
        }
      }
      // After initialization or creation, currentPage should never be null
      if (!this.currentPage) {
        throw new Error('Failed to initialize ScoutPage');
      }
      return this.currentPage;
    });
  }

  /**
   * Get the browser context
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * Get the browser instance
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Check if session is initialized
   */
  isInitialized(): boolean {
    return this.browser !== null && this.context !== null;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Set authentication status
   */
  setAuthenticated(authenticated: boolean, role?: string): void {
    this.isAuthenticated = authenticated;
    if (role) {
      this.currentRole = role;
    }
  }

  /**
   * Get current authenticated role
   */
  getCurrentRole(): string | null {
    return this.currentRole;
  }

  /**
   * Get or create an EUI component wrapper
   */
  getEuiComponent(component: string, selector: string): any {
    const key = `${component}:${selector}`;
    if (this.euiComponentsCache.has(key)) {
      return this.euiComponentsCache.get(key);
    }
    return null;
  }

  /**
   * Create an EUI component wrapper
   * Uses simplified local wrappers that work with ScoutPage
   */
  async createEuiComponent(
    component: string,
    selector: string | { dataTestSubj?: string; locator?: string }
  ): Promise<any> {
    const scoutPage = await this.getPage();

    switch (component) {
      case 'comboBox':
        return createSimplifiedEuiComboBoxWrapper(scoutPage, selector);
      case 'checkBox':
        return createSimplifiedEuiCheckBoxWrapper(scoutPage, selector);
      case 'dataGrid':
        return createSimplifiedEuiDataGridWrapper(scoutPage, selector);
      case 'selectable':
        return createSimplifiedEuiSelectableWrapper(scoutPage, selector);
      default:
        throw new Error(`Unknown EUI component: ${component}`);
    }
  }

  /**
   * Set an EUI component in the cache
   */
  setEuiComponent(component: string, selector: string, wrapper: any): void {
    const key = `${component}:${selector}`;
    this.euiComponentsCache.set(key, wrapper);
  }

  /**
   * Clear EUI components cache
   */
  clearEuiComponents(): void {
    this.euiComponentsCache.clear();
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<void> {
    const page = await this.getPage();
    await page.goto(url);
  }

  /**
   * Take a screenshot
   */
  async screenshot(options?: { path?: string; fullPage?: boolean }): Promise<Buffer> {
    const page = await this.getPage();
    return await page.screenshot(options);
  }

  /**
   * Get page snapshot (accessibility tree) - legacy format
   */
  async getSnapshot(): Promise<string> {
    const page = await this.getPage();
    const snapshot = await page.accessibility.snapshot();
    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * Get ARIA snapshot with element references
   * Returns YAML-like format optimized for AI consumption
   * Elements include [ref=eN] markers for precise targeting
   */
  async getAriaSnapshot(): Promise<string> {
    const page = await this.getPage();
    try {
      // Use browser's ariaSnapshot() API for AI-optimized output
      const snapshot = await page.locator('body').ariaSnapshot();
      return snapshot;
    } catch (err) {
      // Fallback to JSON snapshot if ariaSnapshot fails
      this.log.debug('ariaSnapshot failed, falling back to JSON snapshot');
      return await this.getSnapshot();
    }
  }

  /**
   * Close the session and cleanup resources
   */
  async close(): Promise<void> {
    this.log.info('Closing Scout session...');

    this.clearEuiComponents();

    // Clean up all active custom roles
    if (this.activeCustomRoles.size > 0 && this.esClient) {
      this.log.debug(`Cleaning up ${this.activeCustomRoles.size} custom role(s)`);
      const cleanupPromises = Array.from(this.activeCustomRoles).map((roleName) =>
        this.cleanupCustomRole(roleName)
      );
      await Promise.all(cleanupPromises);
    }

    if (this.currentPage) {
      await this.currentPage.close();
      this.currentPage = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.isAuthenticated = false;
    this.currentRole = null;
    this.samlSessionManager = null;
    this.esClient = null;
    this.kbnClient = null;
    this.kbnUrl = null;
    this.scoutConfig = null;
    this.customRoleName = '';
    this.customRoleHash = '';
    this.activeCustomRoles.clear();
    this.roleSessionCache.clear();
    this.supportedRoles = [];

    // Clear tracking data
    this.consoleLogs = [];
    this.networkActivity = [];
    this.actionHistory = [];

    this.log.success('Scout session closed');
  }

  /**
   * Get console logs captured during the session
   */
  getConsoleLogs(): Array<{ type: string; text: string; timestamp: number }> {
    return [...this.consoleLogs];
  }

  /**
   * Get network activity captured during the session
   */
  getNetworkActivity(): Array<{
    url: string;
    method: string;
    status: number;
    timestamp: number;
  }> {
    return [...this.networkActivity];
  }

  /**
   * Get action history captured during the session
   */
  getActionHistory(): Array<{
    type: string;
    timestamp: number;
    [key: string]: any;
  }> {
    return [...this.actionHistory];
  }

  /**
   * Add an action to the history
   */
  private addAction(action: { type: string; [key: string]: any }): void {
    this.actionHistory.push({
      ...action,
      timestamp: Date.now(),
    });
  }

  /**
   * Setup console and network listeners on a page
   */
  private setupPageListeners(page: Page): void {
    // Console log listener
    page.on('console', (msg) => {
      this.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
      });
    });

    // Network request listener
    page.on('request', (request) => {
      this.addAction({
        type: 'network_request',
        url: request.url(),
        method: request.method(),
      });
    });

    // Network response listener
    page.on('response', (response) => {
      this.networkActivity.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
        timestamp: Date.now(),
      });
    });
  }
}
