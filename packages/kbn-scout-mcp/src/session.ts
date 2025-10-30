/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ScoutTestConfig, KibanaRole, ElasticsearchRoleDescriptor } from '@kbn/scout';
import type { SamlSessionManager } from '@kbn/test';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import {
  EuiComboBoxWrapper,
  EuiCheckBoxWrapper,
  EuiDataGridWrapper,
  EuiSelectableWrapper,
} from '@kbn/scout';
import {
  createSamlSessionManager,
  getEsClient,
  getKbnClient,
  createKbnUrl,
} from '@kbn/scout/src/common/services';
import { createCustomRole, createElasticsearchCustomRole } from '@kbn/scout/src/common/services';
import { createScoutTestConfig } from './config';
import type { ScoutMcpConfig } from './types';

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

    // Create a ScoutLogger-compatible logger wrapper
    const scoutLog = this.log as any;

    // Initialize clients
    this.esClient = getEsClient(this.scoutConfig, scoutLog);
    this.kbnClient = getKbnClient(this.scoutConfig, scoutLog);
    this.kbnUrl = createKbnUrl(this.scoutConfig, scoutLog);

    // Initialize SAML session manager
    this.samlSessionManager = createSamlSessionManager(
      this.scoutConfig,
      scoutLog,
      this.customRoleName
    );

    this.log.success('Scout services initialized');
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
   */
  async initialize(): Promise<void> {
    this.log.info('Initializing Scout session...');

    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.context = await this.browser.newContext({
      baseURL: this.config.targetUrl,
      ignoreHTTPSErrors: true,
    });

    this.currentPage = await this.context.newPage();

    // Initialize Scout services for authentication
    await this.initializeScoutServices();

    this.log.success('Scout session initialized');
  }

  /**
   * Get the current page, creating one if needed
   */
  async getPage(): Promise<Page> {
    if (!this.currentPage) {
      if (!this.context) {
        await this.initialize();
      }
      this.currentPage = await this.context!.newPage();
    }
    return this.currentPage;
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
   */
  async createEuiComponent(
    component: string,
    selector: string | { dataTestSubj?: string; locator?: string }
  ): Promise<any> {
    const page = await this.getPage();

    switch (component) {
      case 'comboBox':
        return new EuiComboBoxWrapper(page as any, selector as any);
      case 'checkBox':
        return new EuiCheckBoxWrapper(page as any, selector as any);
      case 'dataGrid':
        return new EuiDataGridWrapper(page as any, selector as any);
      case 'selectable':
        return new EuiSelectableWrapper(page as any, selector as any);
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
   * Get page snapshot (accessibility tree)
   */
  async getSnapshot(): Promise<string> {
    const page = await this.getPage();
    const snapshot = await page.accessibility.snapshot();
    return JSON.stringify(snapshot, null, 2);
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
