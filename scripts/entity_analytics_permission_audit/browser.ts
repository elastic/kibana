/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chromium } from '@playwright/test';
import type { Page, Browser, BrowserContext } from '@playwright/test';
import type {
  Persona,
  CorrelationEntry,
  FlyoutCorrelationEntry,
  FlyoutCheckResult,
  BrowserCheckResult,
  ObservedState,
  InBrowserApiResult,
  PersonaBrowserResult,
} from './types';
import { PRIVILEGE_ENDPOINT_PATHS, buildSpacePath } from './endpoints';
import type { EndpointId } from './types';
import { TEST_ENTITY_NAME } from './seed';

const PAGE_TIMEOUT_MS = 30_000;
const LOGIN_TIMEOUT_MS = 15_000;

/** API version per endpoint path (internal = '1' or '2', public = '2023-10-31') */
const ENDPOINT_VERSIONS: Record<string, string> = {
  '/internal/risk_score/engine/privileges': '1',
  '/internal/security/entity_store/check_privileges': '2',
  '/api/entity_store/privileges': '1',
  '/api/entity_analytics/watchlists/privileges': '2023-10-31',
  '/internal/entity_analytics/leads/privileges': '1',
  '/internal/asset_criticality/privileges': '1',
};

const loginAsPersona = async (
  page: Page,
  kibanaUrl: string,
  persona: Persona
): Promise<boolean> => {
  try {
    await page.goto(`${kibanaUrl}/login`, { timeout: PAGE_TIMEOUT_MS });
    await page.locator('[data-test-subj="loginUsername"]').fill(persona.username);
    await page.locator('[data-test-subj="loginPassword"]').fill(persona.password);
    await page.locator('[data-test-subj="loginSubmit"]').click();
    await page.waitForURL(/\/app\//, { timeout: LOGIN_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
};

/** Call a privilege endpoint from within the browser's session context */
const fetchPrivilegeInBrowser = async (
  page: Page,
  path: string,
  version: string
): Promise<InBrowserApiResult['response']> => {
  const result = await page.evaluate(
    async ({ apiPath, apiVersion }: { apiPath: string; apiVersion: string }) => {
      try {
        const res = await fetch(apiPath, {
          headers: {
            'elastic-api-version': apiVersion,
            'x-elastic-internal-origin': 'Kibana',
          },
        });
        const text = await res.text();
        try {
          return { ok: res.ok, status: res.status, data: JSON.parse(text) };
        } catch {
          return { ok: false, status: res.status, data: null, raw: text };
        }
      } catch (e) {
        return { ok: false, status: 0, data: null, raw: String(e) };
      }
    },
    { apiPath: path, apiVersion: version }
  );

  if (result.ok && result.data) {
    return result.data as InBrowserApiResult['response'];
  }
  throw new Error(
    `HTTP ${result.status}: ${
      typeof result.raw === 'string'
        ? result.raw.slice(0, 200)
        : JSON.stringify(result.data).slice(0, 200)
    }`
  );
};

const fetchAllPrivilegesInBrowser = async (
  page: Page,
  spacePath: string
): Promise<InBrowserApiResult[]> => {
  const results: InBrowserApiResult[] = [];
  for (const [endpointId, path] of Object.entries(PRIVILEGE_ENDPOINT_PATHS) as Array<
    [EndpointId, string]
  >) {
    const fullPath = `${spacePath}${path}`;
    const version = ENDPOINT_VERSIONS[path] ?? '1';
    let response: InBrowserApiResult['response'] = null;
    let error: string | undefined;
    try {
      response = await fetchPrivilegeInBrowser(page, fullPath, version);
      if (!response) error = `No response (HTTP error) for ${path}`;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    results.push({ endpointId, response, error });
  }
  return results;
};

const checkSelector = async (
  page: Page,
  selector: string
): Promise<'present' | 'absent' | 'disabled'> => {
  try {
    const locator = page.locator(selector.replace(/\[disabled\]$/, ''));
    const count = await locator.count();
    if (count === 0) return 'absent';
    if (selector.endsWith('[disabled]')) {
      const isDisabled =
        (await locator.first().getAttribute('disabled')) !== null ||
        (await locator.first().getAttribute('aria-disabled')) === 'true';
      return isDisabled ? 'disabled' : 'present';
    }
    return 'present';
  } catch {
    return 'absent';
  }
};

const navigateTo = async (page: Page, url: string): Promise<boolean> => {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    await page.waitForTimeout(2000);
    return true;
  } catch {
    return false;
  }
};

/**
 * Checks a single feature gate using:
 *   1. Text visibility  — page.getByText() substring match
 *   2. Button ARIA state — page.getByRole('button', { disabled }) for button state checks
 *
 * Assertions are inverted automatically depending on access level:
 *   denied  → textWhenDenied visible, textWhenGranted absent, buttons disabled
 *   granted → textWhenGranted visible, textWhenDenied absent, buttons enabled
 */
const checkCorrelationEntry = async (
  page: Page,
  entry: CorrelationEntry,
  apiGranted: boolean
): Promise<BrowserCheckResult> => {
  const textShouldBeVisible = apiGranted ? entry.textWhenGranted ?? [] : entry.textWhenDenied ?? [];
  const textShouldBeHidden = apiGranted ? entry.textWhenDenied ?? [] : entry.textWhenGranted ?? [];
  const buttons = entry.buttonDisabledWhenDenied ?? [];

  if (textShouldBeVisible.length === 0 && textShouldBeHidden.length === 0 && buttons.length === 0) {
    return {
      featureName: entry.featureName,
      observed: 'skipped',
      details: 'No text or button assertions defined for this feature gate',
    };
  }

  const failures: string[] = [];

  // Text that should be visible
  for (const text of textShouldBeVisible) {
    try {
      const visible = await page.getByText(text, { exact: false }).first().isVisible();
      if (!visible) failures.push(`Expected "${text}" to be visible`);
    } catch {
      failures.push(`Error checking visibility of "${text}"`);
    }
  }

  // Text that should NOT be visible
  for (const text of textShouldBeHidden) {
    try {
      const visible = await page.getByText(text, { exact: false }).first().isVisible();
      if (visible) failures.push(`Expected "${text}" to NOT be visible`);
    } catch {
      // Element not found → it is hidden, which is what we want
    }
  }

  // Button state (disabled when denied, enabled when granted)
  for (const btnName of buttons) {
    try {
      const btn = page.getByRole('button', { name: btnName, exact: false }).first();
      const count = await btn.count();
      if (count === 0) {
        if (!apiGranted) {
          // Button absent when denied — treat same as disabled (access revoked entirely)
        } else {
          failures.push(`Expected button "${btnName}" to be visible and enabled`);
        }
      } else {
        const isDisabled =
          (await btn.getAttribute('disabled')) !== null ||
          (await btn.getAttribute('aria-disabled')) === 'true';
        if (!apiGranted && !isDisabled) {
          failures.push(`Expected button "${btnName}" to be disabled but it is enabled`);
        } else if (apiGranted && isDisabled) {
          failures.push(`Expected button "${btnName}" to be enabled but it is disabled`);
        }
      }
    } catch {
      failures.push(`Error checking button state for "${btnName}"`);
    }
  }

  if (failures.length > 0) {
    return {
      featureName: entry.featureName,
      observed: 'error' as ObservedState,
      details: failures.join('; '),
    };
  }

  return { featureName: entry.featureName, observed: 'present' };
};

const FLYOUT_OPEN_TIMEOUT_MS = 20_000;

/**
 * Opens the entity flyout for TEST_ENTITY_NAME on the EA Home Page and checks
 * each privilege-gated panel.  If the entity is not found in the table (e.g.
 * entity store is empty or the persona lacks read access) every entry is SKIP.
 */
const probeFlyout = async (
  page: Page,
  kibanaUrl: string,
  spacePath: string,
  flyoutMap: FlyoutCorrelationEntry[],
  apiValueLookup: Map<string, Record<string, boolean | null>>
): Promise<{ checks: FlyoutCheckResult[]; skipReason?: string }> => {
  const checks: FlyoutCheckResult[] = [];

  // Navigate to EA home page
  const homeUrl = `${kibanaUrl}${spacePath}/app/security/entity_analytics`;
  const navigated = await navigateTo(page, homeUrl);
  if (!navigated) {
    const reason = `Failed to navigate to ${homeUrl}`;
    return {
      checks: flyoutMap.map((e) => ({
        panelLabel: e.panelLabel,
        endpoint: e.endpoint,
        privilegeField: e.privilegeField,
        apiValue: apiValueLookup.get(e.endpoint)?.[e.privilegeField] ?? null,
        observed: 'error' as ObservedState,
        status: 'ERROR',
        details: reason,
      })),
      skipReason: reason,
    };
  }

  // Wait a little extra for the entity table to render
  await page.waitForTimeout(3000);

  // Find the expand button next to ea-audit-test-user
  // The table groups entities; the button has aria-label="Open entity details"
  // and is rendered near the entity name text.
  let flyoutOpened = false;
  try {
    // Find a row/cell containing the test entity name
    const entityCell = page.locator(`text="${TEST_ENTITY_NAME}"`).first();
    const count = await entityCell.count();

    if (count === 0) {
      const reason = `${TEST_ENTITY_NAME} not found in entity table (entity store may be empty or access denied)`;
      return {
        checks: flyoutMap.map((e) => ({
          panelLabel: e.panelLabel,
          endpoint: e.endpoint,
          privilegeField: e.privilegeField,
          apiValue: apiValueLookup.get(e.endpoint)?.[e.privilegeField] ?? null,
          observed: 'skipped' as ObservedState,
          status: 'SKIP',
          details: reason,
        })),
        skipReason: reason,
      };
    }

    // The expand button is the nearest EuiButtonIcon with iconType="expand"
    // We look for it within the same ancestor group as the entity name cell.
    const expandBtn = page.locator('[aria-label="Open entity details"]').first();
    const btnCount = await expandBtn.count();
    if (btnCount === 0) {
      const reason = 'Expand button (aria-label="Open entity details") not found on page';
      return {
        checks: flyoutMap.map((e) => ({
          panelLabel: e.panelLabel,
          endpoint: e.endpoint,
          privilegeField: e.privilegeField,
          apiValue: apiValueLookup.get(e.endpoint)?.[e.privilegeField] ?? null,
          observed: 'skipped' as ObservedState,
          status: 'SKIP',
          details: reason,
        })),
        skipReason: reason,
      };
    }

    await expandBtn.click();

    // Wait for the flyout header to appear
    await page.waitForSelector('[data-test-subj="user-panel-header"]', {
      timeout: FLYOUT_OPEN_TIMEOUT_MS,
    });
    flyoutOpened = true;
  } catch (err) {
    const reason = `Could not open flyout: ${err instanceof Error ? err.message : String(err)}`;
    return {
      checks: flyoutMap.map((e) => ({
        panelLabel: e.panelLabel,
        endpoint: e.endpoint,
        privilegeField: e.privilegeField,
        apiValue: apiValueLookup.get(e.endpoint)?.[e.privilegeField] ?? null,
        observed: 'error' as ObservedState,
        status: 'ERROR',
        details: reason,
      })),
      skipReason: reason,
    };
  }

  if (!flyoutOpened) {
    const reason = 'Flyout did not open';
    return {
      checks: flyoutMap.map((e) => ({
        panelLabel: e.panelLabel,
        endpoint: e.endpoint,
        privilegeField: e.privilegeField,
        apiValue: apiValueLookup.get(e.endpoint)?.[e.privilegeField] ?? null,
        observed: 'error' as ObservedState,
        status: 'ERROR',
        details: reason,
      })),
      skipReason: reason,
    };
  }

  // Give the flyout panels time to load
  await page.waitForTimeout(2000);

  for (const entry of flyoutMap) {
    const apiValue = apiValueLookup.get(entry.endpoint)?.[entry.privilegeField] ?? null;
    const observed = await checkSelector(page, entry.selectorWhenGranted);

    let status: FlyoutCheckResult['status'];
    let details: string | undefined;

    if (apiValue === true) {
      // Permission granted → panel should be visible
      status = observed === 'present' ? 'PASS' : 'FAIL';
      if (status === 'FAIL') {
        details = `Panel "${entry.panelLabel}" expected to be visible (API granted) but was ${observed}`;
      }
    } else if (apiValue === false) {
      // Permission denied → panel should be absent
      status = observed === 'absent' ? 'PASS' : 'FAIL';
      if (status === 'FAIL') {
        details = `Panel "${entry.panelLabel}" expected to be absent (API denied) but was ${observed}`;
      }
    } else {
      // API error → can't determine expectation
      status = 'ERROR';
      details = 'API value unknown; cannot assert panel state';
    }

    checks.push({
      panelLabel: entry.panelLabel,
      endpoint: entry.endpoint,
      privilegeField: entry.privilegeField,
      apiValue,
      observed,
      status,
      details,
    });
  }

  return { checks };
};

export const probeBrowserForPersonas = async (
  kibanaUrl: string,
  space: string,
  personas: Persona[],
  correlationMap: CorrelationEntry[],
  flyoutMap: FlyoutCorrelationEntry[],
  headed: boolean
): Promise<PersonaBrowserResult[]> => {
  const spacePath = buildSpacePath(space);
  const results: PersonaBrowserResult[] = [];

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: !headed });

    for (const persona of personas) {
      process.stdout.write(`  [browser] ${persona.name}\n`);

      let context: BrowserContext | null = null;
      const personaResult: PersonaBrowserResult = {
        personaId: persona.id,
        apiResults: [],
        browserChecks: [],
        flyoutChecks: [],
        interceptedNetworkCalls: {},
      };

      try {
        context = await browser.newContext({ ignoreHTTPSErrors: true });
        const page = await context.newPage();

        // Intercept responses to privilege endpoints that the UI fires during render.
        // This verifies the UI is actually wired to each expected privilege API.
        page.on('response', async (res) => {
          const url = res.url();
          for (const [endpointId, path] of Object.entries(PRIVILEGE_ENDPOINT_PATHS) as Array<
            [EndpointId, string]
          >) {
            if (url.includes(path) && res.ok()) {
              try {
                const body = (await res.json()) as unknown;
                personaResult.interceptedNetworkCalls[endpointId] = body;
              } catch {
                // non-JSON or body already consumed
              }
            }
          }
        });

        const loggedIn = await loginAsPersona(page, kibanaUrl, persona);
        if (!loggedIn) {
          const errMsg = 'Login failed';
          personaResult.apiResults = Object.keys(PRIVILEGE_ENDPOINT_PATHS).map((id) => ({
            endpointId: id as EndpointId,
            response: null,
            error: errMsg,
          }));
          personaResult.browserChecks = correlationMap.map((entry) => ({
            featureName: entry.featureName,
            observed: 'error' as ObservedState,
            details: errMsg,
          }));
          personaResult.flyoutChecks = flyoutMap.map((entry) => ({
            panelLabel: entry.panelLabel,
            endpoint: entry.endpoint,
            privilegeField: entry.privilegeField,
            apiValue: null,
            observed: 'error' as ObservedState,
            status: 'ERROR' as const,
            details: errMsg,
          }));
          personaResult.interceptedNetworkCalls = {};
          results.push(personaResult);
          continue;
        }

        // Call all privilege APIs from within the browser session
        personaResult.apiResults = await fetchAllPrivilegesInBrowser(page, spacePath);

        // Build a quick lookup: endpoint → privilege field → value
        const apiValueLookup = new Map<string, Record<string, boolean | null>>();
        for (const r of personaResult.apiResults) {
          if (r.response) {
            apiValueLookup.set(r.endpointId, {
              has_all_required: r.response.has_all_required ?? null,
              has_read_permissions: r.response.has_read_permissions ?? null,
              has_write_permissions: r.response.has_write_permissions ?? null,
            });
          }
        }

        // Navigate to each unique page and check DOM elements
        const pageGroups = new Map<string, CorrelationEntry[]>();
        for (const entry of correlationMap) {
          const pageUrl = `${kibanaUrl}${spacePath}${entry.page}`;
          const existing = pageGroups.get(pageUrl) ?? [];
          existing.push(entry);
          pageGroups.set(pageUrl, existing);
        }

        for (const [pageUrl, entries] of pageGroups) {
          const navigated = await navigateTo(page, pageUrl);
          if (!navigated) {
            for (const entry of entries) {
              personaResult.browserChecks.push({
                featureName: entry.featureName,
                observed: 'error',
                details: `Failed to navigate to ${pageUrl}`,
              });
            }
            continue;
          }

          for (const entry of entries) {
            const endpointValues = apiValueLookup.get(entry.endpoint) ?? {};
            const apiValue = endpointValues[entry.privilegeField] ?? null;
            if (apiValue === null) {
              // API call errored — can't determine expected state, skip UI check
              personaResult.browserChecks.push({
                featureName: entry.featureName,
                observed: 'skipped',
                details: 'API call failed; cannot determine expected UI state',
              });
              continue;
            }
            const result = await checkCorrelationEntry(page, entry, apiValue === true);
            personaResult.browserChecks.push(result);
          }
        }

        // Flyout probe: only run if entity store read is granted
        const entityStoreRead = apiValueLookup.get('entity_store')?.has_read_permissions ?? null;
        if (entityStoreRead === false) {
          personaResult.flyoutSkipReason =
            'entity_store.has_read_permissions is false; flyout is inaccessible';
          personaResult.flyoutChecks = flyoutMap.map((entry) => ({
            panelLabel: entry.panelLabel,
            endpoint: entry.endpoint,
            privilegeField: entry.privilegeField,
            apiValue: apiValueLookup.get(entry.endpoint)?.[entry.privilegeField] ?? null,
            observed: 'skipped' as ObservedState,
            status: 'SKIP' as const,
            details: personaResult.flyoutSkipReason,
          }));
        } else {
          process.stdout.write(`  [flyout] ${persona.name}\n`);
          const flyoutResult = await probeFlyout(
            page,
            kibanaUrl,
            spacePath,
            flyoutMap,
            apiValueLookup
          );
          personaResult.flyoutChecks = flyoutResult.checks;
          if (flyoutResult.skipReason) {
            personaResult.flyoutSkipReason = flyoutResult.skipReason;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        for (const entry of correlationMap) {
          if (!personaResult.browserChecks.some((r) => r.featureName === entry.featureName)) {
            personaResult.browserChecks.push({
              featureName: entry.featureName,
              observed: 'error',
              details: msg,
            });
          }
        }
        for (const entry of flyoutMap) {
          if (!personaResult.flyoutChecks.some((r) => r.panelLabel === entry.panelLabel)) {
            personaResult.flyoutChecks.push({
              panelLabel: entry.panelLabel,
              endpoint: entry.endpoint,
              privilegeField: entry.privilegeField,
              apiValue: null,
              observed: 'error' as ObservedState,
              status: 'ERROR',
              details: msg,
            });
          }
        }
      } finally {
        await context?.close();
      }

      results.push(personaResult);
    }
  } finally {
    await browser?.close();
  }

  return results;
};
