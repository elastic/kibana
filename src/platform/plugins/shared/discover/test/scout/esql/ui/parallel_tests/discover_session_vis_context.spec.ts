/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { DiscoverSessionApiData } from '@kbn/as-code-discover-schema';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../../../../common/constants';
import type { DiscoverTestFixtures, DiscoverWorkerFixtures } from '../fixtures';
import { spaceTest } from '../fixtures';

const ESQL_QUERY = 'from logstash-* | limit 10';
const BREAKDOWN_QUERY = 'from logstash-*';
const STATS_QUERY = 'from logstash-* | stats averageB = avg(bytes) by extension';
const BREAKDOWN_LEGEND_LABELS = ['css', 'gif', 'jpg', 'php', 'png'];

// Use a copy that Discover has never opened so local tab state cannot mask lost chart settings.
const roundTripSavedVisualization = async (
  {
    config,
    page,
    scoutSpace,
    kbnClient,
  }: Pick<
    DiscoverTestFixtures & DiscoverWorkerFixtures,
    'config' | 'page' | 'scoutSpace' | 'kbnClient'
  >,
  sessionName: string
) => {
  const { id: sessionId, attributes: savedAttributes } = await spaceTest.step(
    'copy the saved session without local tab state',
    async () => {
      const { saved_objects: sessions } =
        await kbnClient.savedObjects.find<DiscoverSessionAttributes>({
          type: 'search',
          space: scoutSpace.id,
        });
      const matchingSessions = sessions.filter(
        ({ attributes }) => attributes.title === sessionName
      );
      expect(matchingSessions).toHaveLength(1);
      const [savedSession] = matchingSessions;
      expect(savedSession.attributes.tabs).toHaveLength(1);
      expect(savedSession.attributes.tabs[0].attributes.visContext).toBeDefined();

      const { id } = await kbnClient.savedObjects.create({
        type: 'search',
        space: scoutSpace.id,
        overwrite: false,
        attributes: { ...savedSession.attributes, title: `${sessionName} copy` },
        references: savedSession.references,
      });

      return { id, attributes: savedSession.attributes };
    }
  );

  return spaceTest.step(
    'round-trip the chart through GET and PUT and check persistence',
    async () => {
      const sessionUrl = `${config.hosts.kibana}/s/${scoutSpace.id}${DISCOVER_SESSION_API_BASE_PATH}/${sessionId}`;
      const headers = {
        'kbn-xsrf': 'scout',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': DISCOVER_SESSION_API_VERSION,
      };
      const loaded = await page.request.get(sessionUrl, { headers });
      expect(loaded.status()).toBe(200);
      const loadedBody: { data: DiscoverSessionApiData } = await loaded.json();
      expect(loadedBody).not.toHaveProperty('warnings');
      const { data } = loadedBody;
      expect(data.tabs).toHaveLength(1);
      const [tab] = data.tabs;
      expect(tab.vis_context).toBeDefined();
      expect(savedAttributes.tabs[0].attributes.visContext).toMatchObject({
        suggestionType: tab.vis_context?.suggestion_type,
        attributes: tab.vis_context?.attributes,
      });

      const updated = await page.request.put(sessionUrl, { headers, data });
      expect(updated.status()).toBe(200);
      expect(await updated.json()).toMatchObject({ id: sessionId, data });

      const reloaded = await page.request.get(sessionUrl, { headers });
      expect(reloaded.status()).toBe(200);
      const reloadedBody: { data: DiscoverSessionApiData } = await reloaded.json();
      expect(reloadedBody).not.toHaveProperty('warnings');
      expect(reloadedBody.data).toStrictEqual(data);

      const storedSession = await kbnClient.savedObjects.get<DiscoverSessionAttributes>({
        type: 'search',
        id: sessionId,
        space: scoutSpace.id,
      });
      expect(storedSession.attributes.tabs).toHaveLength(1);
      const { visContext } = storedSession.attributes.tabs[0].attributes;
      expect(visContext).toStrictEqual(savedAttributes.tabs[0].attributes.visContext);

      return { sessionId, tab, visContext };
    }
  );
};

spaceTest.describe(
  'Discover session API — visualization persistence',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'preserves a saved Line histogram through a session API round trip',
      async ({ config, page, pageObjects, scoutSpace, kbnClient }) => {
        const { discover } = pageObjects;
        const sessionName = `ESQL Line API round trip ${scoutSpace.id}`;

        await spaceTest.step('save a customized chart and verify a normal reload', async () => {
          await discover.writeAndSubmitEsqlQuery(ESQL_QUERY);
          await discover.changeVisualizationShape('Line');
          expect(await discover.getVisualizationTitle()).toBe('Line');

          await discover.saveSearch(sessionName);
          await page.reload();
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getVisualizationTitle()).toBe('Line');
        });

        const { sessionId, tab, visContext } = await roundTripSavedVisualization(
          { config, page, scoutSpace, kbnClient },
          sessionName
        );
        expect(tab).toMatchObject({
          data_source: { type: 'esql', query: ESQL_QUERY },
          vis_context: { suggestion_type: 'histogramForESQL' },
        });
        expect(visContext).toMatchObject({
          requestData: { dataViewId: expect.stringMatching(/\S/), timeField: '@timestamp' },
        });

        await spaceTest.step('open the saved copy without local tab state', async () => {
          await discover.goto({ queryMode: 'esql', savedSearchId: sessionId });
          await discover.waitUntilTabIsLoaded();
          await expect(discover.getHistogramChart()).toBeVisible();
          expect(await discover.getEsqlQueryValue()).toBe(ESQL_QUERY);
          expect(await discover.getVisualizationTitle()).toBe('Line');
          expect(await discover.getHistogramSuggestionType()).toBe('histogramForESQL');
        });
      }
    );

    spaceTest(
      'preserves a histogram breakdown and its legend through a session API round trip',
      async ({ config, page, pageObjects, scoutSpace, kbnClient }) => {
        const { discover } = pageObjects;
        const sessionName = `ESQL breakdown API round trip ${scoutSpace.id}`;

        await spaceTest.step('save a Line histogram with a breakdown', async () => {
          await discover.writeAndSubmitEsqlQuery(BREAKDOWN_QUERY);
          await discover.chooseBreakdownField('extension');
          await discover.changeVisualizationShape('Line');
          await expect
            .poll(() => discover.getHistogramLegendLabels())
            .toStrictEqual(BREAKDOWN_LEGEND_LABELS);
          expect(await discover.getVisualizationTitle()).toBe('Line');
          await discover.saveSearch(sessionName);
        });

        const { sessionId, tab, visContext } = await roundTripSavedVisualization(
          { config, page, scoutSpace, kbnClient },
          sessionName
        );
        expect(tab).toMatchObject({
          data_source: { type: 'esql', query: BREAKDOWN_QUERY },
          breakdown_field: 'extension',
          vis_context: { suggestion_type: 'histogramForESQL' },
        });
        expect(visContext).toMatchObject({
          requestData: {
            dataViewId: expect.stringMatching(/\S/),
            timeField: '@timestamp',
            breakdownField: 'extension',
          },
        });

        await spaceTest.step('reopen the chart with the same breakdown and series', async () => {
          await discover.goto({ queryMode: 'esql', savedSearchId: sessionId });
          await discover.waitUntilTabIsLoaded();
          await expect(discover.getHistogramChart()).toHaveAttribute(
            'data-suggestion-type',
            'histogramForESQL'
          );
          await expect
            .poll(() => discover.getHistogramLegendLabels())
            .toStrictEqual(BREAKDOWN_LEGEND_LABELS);
          expect(await discover.getVisualizationTitle()).toBe('Line');
          expect(await discover.getEsqlQueryValue()).toBe(BREAKDOWN_QUERY);
        });
      }
    );

    spaceTest(
      'preserves a Treemap Lens suggestion through a session API round trip',
      async ({ config, page, pageObjects, scoutSpace, kbnClient }) => {
        const { discover } = pageObjects;
        const sessionName = `ESQL Treemap API round trip ${scoutSpace.id}`;

        await spaceTest.step('save a Treemap for an aggregated query', async () => {
          await discover.writeAndSubmitEsqlQuery(STATS_QUERY);
          await discover.chooseVisualizationSuggestion('treemap');
          await expect(page.getByTestId('partitionVisChart')).toBeVisible();
          await expect(discover.getHistogramChart()).toHaveAttribute(
            'data-suggestion-type',
            'lensSuggestion'
          );
          expect(await discover.getVisualizationTitle()).toBe('Treemap');
          await discover.saveSearch(sessionName);
        });

        const { sessionId, tab, visContext } = await roundTripSavedVisualization(
          { config, page, scoutSpace, kbnClient },
          sessionName
        );
        expect(tab).toMatchObject({
          data_source: { type: 'esql', query: STATS_QUERY },
          vis_context: { suggestion_type: 'lensSuggestion' },
        });
        expect(visContext).toMatchObject({
          requestData: { dataViewId: expect.stringMatching(/\S/) },
        });

        await spaceTest.step('reopen the same Treemap and aggregated query', async () => {
          await discover.goto({ queryMode: 'esql', savedSearchId: sessionId });
          await discover.waitUntilTabIsLoaded();
          await expect(page.getByTestId('partitionVisChart')).toBeVisible();
          await expect(discover.getHistogramChart()).toHaveAttribute(
            'data-suggestion-type',
            'lensSuggestion'
          );
          expect(await discover.getVisualizationTitle()).toBe('Treemap');
          expect(await discover.getEsqlQueryValue()).toBe(STATS_QUERY);
        });
      }
    );
  }
);
