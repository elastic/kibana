/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout/ui';
import type { SavedObject } from '@kbn/core-saved-objects-common';
import type { XYVisualizationState } from '@kbn/lens-plugin/public';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram';
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
): Promise<{
  sessionId: string;
  tab: DiscoverSessionApiData['tabs'][number];
  visContext: DiscoverSessionAttributes['tabs'][number]['attributes']['visContext'];
}> => {
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

type LegacyVisContext = Omit<UnifiedHistogramVisContext, 'attributes'> & {
  attributes: Omit<UnifiedHistogramVisContext['attributes'], 'version'> & { version?: 1 };
};

const createLegacySession = async (
  { kbnClient, scoutSpace }: Pick<DiscoverWorkerFixtures, 'kbnClient' | 'scoutSpace'>,
  sourceSession: SavedObject<DiscoverSessionAttributes>,
  visContext: LegacyVisContext
): Promise<string> => {
  const [tab] = sourceSession.attributes.tabs;
  const { id } = await kbnClient.savedObjects.create({
    type: 'search',
    space: scoutSpace.id,
    overwrite: false,
    attributes: {
      ...sourceSession.attributes,
      title: `${sourceSession.attributes.title} legacy`,
      tabs: [{ ...tab, attributes: { ...tab.attributes, visContext } }],
    },
    references: sourceSession.references,
  });
  const stored = await kbnClient.savedObjects.get<DiscoverSessionAttributes>({
    type: 'search',
    id,
    space: scoutSpace.id,
  });
  expect(stored.attributes.tabs[0].attributes.visContext).toStrictEqual(visContext);

  return id;
};

const prepareLegacyVisualization = async ({
  pageObjects,
  scoutSpace,
  kbnClient,
}: Pick<
  DiscoverTestFixtures & DiscoverWorkerFixtures,
  'pageObjects' | 'scoutSpace' | 'kbnClient'
>): Promise<{
  sourceSession: SavedObject<DiscoverSessionAttributes>;
  legacyVisContext: LegacyVisContext;
}> => {
  const { discover } = pageObjects;
  const sessionName = `ESQL legacy chart ${scoutSpace.id} ${uuidv4()}`;
  await discover.writeAndSubmitEsqlQuery(BREAKDOWN_QUERY);
  await discover.chooseBreakdownField('extension');
  await discover.changeVisualizationShape('Line');
  await expect
    .poll(() => discover.getHistogramLegendLabels())
    .toStrictEqual(BREAKDOWN_LEGEND_LABELS);
  expect(await discover.getVisualizationTitle()).toBe('Line');
  await discover.saveSearch(sessionName);

  const { saved_objects: sessions } = await kbnClient.savedObjects.find<DiscoverSessionAttributes>({
    type: 'search',
    space: scoutSpace.id,
  });
  const matchingSessions = sessions.filter(({ attributes }) => attributes.title === sessionName);
  expect(matchingSessions).toHaveLength(1);
  const [sourceSession] = matchingSessions;
  expect(sourceSession.attributes.tabs).toHaveLength(1);
  const { visContext } = sourceSession.attributes.tabs[0].attributes;
  expect(visContext).toMatchObject({ attributes: { visualizationType: 'lnsXY' } });
  const chart = visContext as UnifiedHistogramVisContext;
  const visualization = chart.attributes.state.visualization as XYVisualizationState;
  expect(visualization.layers).toHaveLength(1);
  const [layer] = visualization.layers;
  expect(layer).toMatchObject({ splitAccessors: ['extension'] });

  // Keep the current query and fingerprint, changing only the stored visualization format.
  const legacyVisContext: LegacyVisContext = {
    ...chart,
    attributes: {
      ...omit(chart.attributes, 'version'),
      state: {
        ...chart.attributes.state,
        visualization: {
          ...visualization,
          layers: [{ ...omit(layer, 'splitAccessors'), splitAccessor: 'extension' }],
        },
      },
    },
  };

  return { sourceSession, legacyVisContext };
};

// Failing: See https://github.com/elastic/kibana/issues/295237
spaceTest.describe.skip(
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

        await spaceTest.step('save the reopened chart and verify a fresh copy', async () => {
          const resavedName = `${sessionName} resaved`;
          await discover.saveSearch(resavedName);
          const { sessionId: resavedId, visContext: resavedVisContext } =
            await roundTripSavedVisualization({ config, page, scoutSpace, kbnClient }, resavedName);
          expect(resavedVisContext).toStrictEqual(visContext);

          await discover.goto({ queryMode: 'esql', savedSearchId: resavedId });
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getVisualizationTitle()).toBe('Line');
          expect(await discover.getEsqlQueryValue()).toBe(ESQL_QUERY);
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

        await spaceTest.step('save the reopened breakdown and verify a fresh copy', async () => {
          const resavedName = `${sessionName} resaved`;
          await discover.saveSearch(resavedName);
          const { sessionId: resavedId, visContext: resavedVisContext } =
            await roundTripSavedVisualization({ config, page, scoutSpace, kbnClient }, resavedName);
          expect(resavedVisContext).toStrictEqual(visContext);

          await discover.goto({ queryMode: 'esql', savedSearchId: resavedId });
          await discover.waitUntilTabIsLoaded();
          await expect
            .poll(() => discover.getHistogramLegendLabels())
            .toStrictEqual(BREAKDOWN_LEGEND_LABELS);
          expect(await discover.getVisualizationTitle()).toBe('Line');
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

        await spaceTest.step('save the reopened Treemap and verify a fresh copy', async () => {
          const resavedName = `${sessionName} resaved`;
          await discover.saveSearch(resavedName);
          const { sessionId: resavedId, visContext: resavedVisContext } =
            await roundTripSavedVisualization({ config, page, scoutSpace, kbnClient }, resavedName);
          expect(resavedVisContext).toStrictEqual(visContext);

          await discover.goto({ queryMode: 'esql', savedSearchId: resavedId });
          await discover.waitUntilTabIsLoaded();
          await expect(page.getByTestId('partitionVisChart')).toBeVisible();
          expect(await discover.getVisualizationTitle()).toBe('Treemap');
        });
      }
    );

    spaceTest(
      'preserves a legacy single-field breakdown through UI save and an API round trip',
      async ({ config, page, pageObjects, scoutSpace, kbnClient }) => {
        const { discover } = pageObjects;
        const { sourceSession, legacyVisContext } = await prepareLegacyVisualization({
          pageObjects,
          scoutSpace,
          kbnClient,
        });
        const sessionName = `${sourceSession.attributes.title} resaved`;
        const sessionId = await createLegacySession({ kbnClient, scoutSpace }, sourceSession, {
          ...legacyVisContext,
          attributes: { ...legacyVisContext.attributes, version: 1 },
        });

        await spaceTest.step('open the legacy Line histogram and its breakdown', async () => {
          await discover.goto({ queryMode: 'esql', savedSearchId: sessionId });
          await discover.waitUntilTabIsLoaded();
          await expect
            .poll(() => discover.getHistogramLegendLabels())
            .toStrictEqual(BREAKDOWN_LEGEND_LABELS);
          expect(await discover.getVisualizationTitle()).toBe('Line');
        });

        await discover.saveSearch(sessionName);
        const { sessionId: copiedId, tab } = await roundTripSavedVisualization(
          { config, page, scoutSpace, kbnClient },
          sessionName
        );
        expect(tab).toMatchObject({
          data_source: { type: 'esql', query: BREAKDOWN_QUERY },
          breakdown_field: 'extension',
          vis_context: { suggestion_type: 'histogramForESQL' },
        });

        await spaceTest.step('reopen the persisted chart without local tab state', async () => {
          await discover.goto({ queryMode: 'esql', savedSearchId: copiedId });
          await discover.waitUntilTabIsLoaded();
          await expect
            .poll(() => discover.getHistogramLegendLabels())
            .toStrictEqual(BREAKDOWN_LEGEND_LABELS);
          expect(await discover.getVisualizationTitle()).toBe('Line');
          expect(await discover.getEsqlQueryValue()).toBe(BREAKDOWN_QUERY);
        });
      }
    );

    spaceTest(
      'preserves legacy legend values through UI save and an API round trip',
      async ({ config, page, pageObjects, scoutSpace, kbnClient }) => {
        const { discover } = pageObjects;
        const { sourceSession } = await prepareLegacyVisualization({
          pageObjects,
          scoutSpace,
          kbnClient,
        });
        const sessionName = `${sourceSession.attributes.title} resaved`;
        const chart = sourceSession.attributes.tabs[0].attributes
          .visContext as UnifiedHistogramVisContext;
        const visualization = chart.attributes.state.visualization as XYVisualizationState;
        const sessionId = await createLegacySession({ kbnClient, scoutSpace }, sourceSession, {
          ...chart,
          attributes: {
            ...omit(chart.attributes, 'version'),
            state: {
              ...chart.attributes.state,
              visualization: {
                ...visualization,
                valuesInLegend: true,
                legend: { ...omit(visualization.legend, 'legendStats'), isVisible: true },
              },
            },
          },
        });
        const legendItems = discover.getHistogramChart().getByRole('listitem');

        await spaceTest.step('open the legacy chart with values in the legend', async () => {
          await discover.goto({ queryMode: 'esql', savedSearchId: sessionId });
          await discover.waitUntilTabIsLoaded();
          await expect
            .poll(() => discover.getHistogramLegendLabels())
            .toStrictEqual(BREAKDOWN_LEGEND_LABELS);
          await expect(legendItems).toContainText([/\d/]);
          expect(await discover.getVisualizationTitle()).toBe('Line');
        });

        await discover.saveSearch(sessionName);
        const { sessionId: copiedId } = await roundTripSavedVisualization(
          { config, page, scoutSpace, kbnClient },
          sessionName
        );

        await spaceTest.step('reopen the persisted legend without local tab state', async () => {
          await discover.goto({ queryMode: 'esql', savedSearchId: copiedId });
          await discover.waitUntilTabIsLoaded();
          await expect
            .poll(() => discover.getHistogramLegendLabels())
            .toStrictEqual(BREAKDOWN_LEGEND_LABELS);
          await expect(legendItems).toContainText([/\d/]);
          expect(await discover.getVisualizationTitle()).toBe('Line');
          expect(await discover.getEsqlQueryValue()).toBe(BREAKDOWN_QUERY);
        });
      }
    );
  }
);
