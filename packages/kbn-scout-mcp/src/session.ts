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
import type { ScoutTestConfig, KibanaRole, ElasticsearchRoleDescriptor } from '@kbn/scout';
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
 * Kibana URL helper - simplified version of Scout's KibanaUrl
 * Using a simple object instead of class to avoid "too many classes" lint error
 */
function createKibanaUrlHelper(baseUrl: URL) {
  return {
    get(rel?: string): string {
      return new URL(rel ?? '/', baseUrl).href;
    },
    domain(): string {
      return baseUrl.hostname;
    },
    app(appName: string, options?: { space?: string }): string {
      const relPath = options?.space ? `s/${options.space}/app/${appName}` : `/app/${appName}`;
      return new URL(relPath, baseUrl).href;
    },
    toString(): string {
      return baseUrl.href;
    },
  };
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
 * Helper to resolve selector to Playwright locator
 */
function resolveEuiSelector(
  page: Page,
  selector: string | { dataTestSubj?: string; locator?: string }
) {
  if (typeof selector === 'string') {
    return page.locator(subj(selector));
  }
  if (selector.dataTestSubj) {
    return page.locator(subj(selector.dataTestSubj));
  }
  return page.locator(selector.locator!);
}

/**
 * Simplified EUI component wrappers that work with Playwright Page directly
 * These are simplified versions that don't require ScoutPage
 * Using factory functions instead of classes to avoid "too many classes" lint error
 */
function createSimplifiedEuiComboBoxWrapper(
  page: Page,
  selector: string | { dataTestSubj?: string; locator?: string }
) {
  const getLocator = () => resolveEuiSelector(page, selector);

  return {
    async selectSingleOption(value: string) {
      const locator = getLocator();
      await locator.locator(subj('comboBoxInput')).click();
      await locator.locator(subj('comboBoxSearchInput')).fill(value);
      await page.locator(`[title="${value}"]`).click();
    },
    async selectMultiOption(value: string) {
      const locator = getLocator();
      await locator.locator(subj('comboBoxInput')).click();
      await locator.locator(subj('comboBoxSearchInput')).fill(value);
      await page.locator(`[title="${value}"]`).click();
    },
    async clear() {
      const locator = getLocator();
      await locator.locator(subj('comboBoxClearButton')).click();
    },
  };
}

function createSimplifiedEuiCheckBoxWrapper(
  page: Page,
  selector: string | { dataTestSubj?: string; locator?: string }
) {
  const getLocator = () => resolveEuiSelector(page, selector);

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
  page: Page,
  selector: string | { dataTestSubj?: string; locator?: string }
) {
  const getLocator = () => resolveEuiSelector(page, selector);

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
  page: Page,
  selector: string | { dataTestSubj?: string; locator?: string }
) {
  const getLocator = () => resolveEuiSelector(page, selector);

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
 * Manages the Scout session including browser context, page objects, and fixtures
 */
export class ScoutSession {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private currentPage: Page | null = null;
  private pageObjectsCache: Map<string, any> = new Map();
  private euiComponentsCache: Map<string, any> = new Map();
  private isAuthenticated: boolean = false;
  private currentRole: string | null = null;
  private scoutConfig: ScoutTestConfig | null = null;
  private samlSessionManager: SamlSessionManager | null = null;
  private esClient: EsClient | null = null;
  private kbnClient: KbnClient | null = null;
  private kbnUrl: any = null;
  private customRoleName: string = 'custom_role_mcp';
  private customRoleHash: string = '';

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
    const supportedRoles = [...Object.keys(supportedRoleDescriptors)].concat(customRoleName || []);

    const kibanaUrl = new URL(config.hosts.kibana);
    kibanaUrl.username = config.auth.username;
    kibanaUrl.password = config.auth.password;

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
        roles: supportedRoles,
        sourcePath: rolesDefinitionPath,
      },
      cloudUsersFilePath: config.cloudUsersFilePath,
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

    if (this.customRoleHash === newRoleHash) {
      this.log.info('Custom role is already set');
      return;
    }

    const isElasticsearchRole = (r: any): r is ElasticsearchRoleDescriptor => {
      return 'applications' in r;
    };

    if (isElasticsearchRole(role)) {
      await createElasticsearchCustomRole(await this.getEsClient(), this.customRoleName, role);
    } else {
      await createCustomRole(await this.getKbnClient(), this.customRoleName, role);
    }

    this.customRoleHash = newRoleHash;
  }

  /**
   * Get custom role name
   */
  getCustomRoleName(): string {
    return this.customRoleName;
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

      this.currentPage = await this.context.newPage();

      // Initialize Scout services for authentication
      await this.initializeScoutServices();

      this.log.success('Scout session initialized');
    });
  }

  /**
   * Get the current page, creating one if needed
   * Thread-safe: Uses mutex to prevent race conditions
   */
  async getPage(): Promise<Page> {
    return await this.mutex.runExclusive(async () => {
      if (!this.currentPage) {
        if (!this.context) {
          await this.initialize();
        }
        this.log.debug('Creating new page...');
        this.currentPage = await this.context!.newPage();
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
   * Get or create a page object
   */
  getPageObject(name: string): any {
    if (this.pageObjectsCache.has(name)) {
      return this.pageObjectsCache.get(name);
    }

    // Page objects will be created on demand with the current page
    // The actual implementation depends on Scout's page object structure
    return null;
  }

  /**
   * Set a page object in the cache
   */
  setPageObject(name: string, pageObject: any): void {
    this.pageObjectsCache.set(name, pageObject);
  }

  /**
   * Clear page objects cache
   */
  clearPageObjects(): void {
    this.pageObjectsCache.clear();
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
   * Uses simplified local wrappers that work with Playwright Page directly
   */
  async createEuiComponent(
    component: string,
    selector: string | { dataTestSubj?: string; locator?: string }
  ): Promise<any> {
    const page = await this.getPage();

    switch (component) {
      case 'comboBox':
        return createSimplifiedEuiComboBoxWrapper(page, selector);
      case 'checkBox':
        return createSimplifiedEuiCheckBoxWrapper(page, selector);
      case 'dataGrid':
        return createSimplifiedEuiDataGridWrapper(page, selector);
      case 'selectable':
        return createSimplifiedEuiSelectableWrapper(page, selector);
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
      // Use Playwright's ariaSnapshot() API for AI-optimized output
      const snapshot = await page.locator('body').ariaSnapshot();
      return snapshot;
    } catch (err) {
      // Fallback to JSON snapshot if ariaSnapshot fails
      this.log.debug('ariaSnapshot failed, falling back to JSON snapshot');
      return await this.getSnapshot();
    }
  }

  /**
   * Format accessibility tree into a readable format with element references
   * @deprecated Use getAriaSnapshot() instead
   */
  private formatAccessibilityTree(
    node: any,
    indent: string = '',
    refCounter = { value: 0 }
  ): string {
    if (!node) return '';

    const ref = `e${++refCounter.value}`;
    let result = `${indent}- ${node.role}`;

    if (node.name) {
      result += ` "${node.name}"`;
    }

    result += ` [ref=${ref}]`;

    if (node.value) {
      result += ` value="${node.value}"`;
    }

    if (node.children && node.children.length > 0) {
      result += '\n';
      result += node.children
        .map((child: any) => this.formatAccessibilityTree(child, indent + '  ', refCounter))
        .join('\n');
    }

    return result;
  }

  /**
   * Close the session and cleanup resources
   */
  async close(): Promise<void> {
    this.log.info('Closing Scout session...');

    this.clearPageObjects();
    this.clearEuiComponents();

    // Clean up custom role if it was created
    if (this.customRoleHash && this.esClient) {
      try {
        this.log.debug(`Deleting custom role with name ${this.customRoleName}`);
        await this.esClient.security.deleteRole({ name: this.customRoleName });
      } catch (error) {
        this.log.debug(`Failed to delete custom role: ${error}`);
      }
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
    this.customRoleHash = '';

    this.log.success('Scout session closed');
  }
}
