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
import { isLensLegacyAttributes, LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram';
import type { DiscoverSessionApiData } from '@kbn/as-code-discover-schema';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../../../../common/constants';
import type { DiscoverTestFixtures, DiscoverWorkerFixtures } from '../fixtures';
import { spaceTest, testData } from '../fixtures';

const ESQL_QUERY = 'from logstash-* | limit 10';
const BREAKDOWN_QUERY = 'from logstash-*';
const STATS_QUERY = 'from logstash-* | stats averageB = avg(bytes) by extension';
const BREAKDOWN_LEGEND_LABELS = ['css', 'gif', 'jpg', 'php', 'png'];
const TIME_FILTER_INDEX = `scout-discover-lens-time-${uuidv4()}`;
const TIME_FILTER_QUERY = `FROM ${TIME_FILTER_INDEX}`;
const TIME_FILTER_RANGE = {
  from: '2015-09-20T10:00:00.000Z',
  to: '2015-09-20T11:00:00.000Z',
};

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
  await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');
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

    spaceTest.describe('Lens as-code time filtering', () => {
      spaceTest.beforeAll(async ({ esClient, scoutSpace }) => {
        await esClient.indices.create({
          index: TIME_FILTER_INDEX,
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              service: { type: 'keyword' },
            },
          },
        });
        const { errors } = await esClient.bulk({
          index: TIME_FILTER_INDEX,
          refresh: 'wait_for',
          operations: [
            { index: {} },
            { '@timestamp': '2015-09-20T10:15:00.000Z', service: 'early' },
            { index: {} },
            { '@timestamp': '2015-09-20T10:45:00.000Z', service: 'late' },
            { index: {} },
            { '@timestamp': '2015-09-20T12:15:00.000Z', service: 'outside' },
          ],
        });
        expect(errors).toBe(false);
        await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'UTC' });
        await scoutSpace.uiSettings.setDefaultTime(TIME_FILTER_RANGE);
      });

      spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
        await esClient.indices.delete({ index: TIME_FILTER_INDEX, ignore_unavailable: true });
        await scoutSpace.uiSettings.unset('dateFormat:tz');
        await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
      });

      spaceTest(
        'filters a reused histogram by time after a Lens as-code round trip',
        async ({ pageObjects, kbnClient, scoutSpace, apiServices }) => {
          const { discover, datePicker } = pageObjects;
          const sessionName = `ESQL Lens time filter ${scoutSpace.id}`;
          const getRequestData = async (): Promise<
            UnifiedHistogramVisContext['requestData'] | null
          > =>
            JSON.parse(
              (await discover.getHistogramChart().getAttribute('data-request-data')) ?? 'null'
            );

          await discover.writeAndSubmitEsqlQuery(TIME_FILTER_QUERY);
          await discover.chooseBreakdownField('service');
          await discover.changeVisualizationShape('Line');
          await discover.saveSearch(sessionName);

          const { saved_objects: sessions } =
            await kbnClient.savedObjects.find<DiscoverSessionAttributes>({
              type: 'search',
              space: scoutSpace.id,
            });
          const savedSession = sessions.find(({ attributes }) => attributes.title === sessionName);
          const savedVisContext = savedSession?.attributes.tabs[0].attributes.visContext;
          if (
            !savedVisContext ||
            !('attributes' in savedVisContext) ||
            !isLensLegacyAttributes(savedVisContext.attributes)
          ) {
            throw new Error('Expected saved Lens attributes');
          }
          expect(savedVisContext).toMatchObject({
            suggestionType: 'histogramForESQL',
            requestData: { timeField: '@timestamp' },
            attributes: { state: { visualization: { preferredSeriesType: 'line' } } },
          });

          const builder = new LensConfigBuilder(undefined, true);
          const attributes = builder.fromAPIFormat(builder.toAPIFormat(savedVisContext.attributes));
          const layers = Object.values(attributes.state.datasourceStates.textBased?.layers ?? {});
          expect(layers).toHaveLength(1);
          expect(layers[0].timeField).toBeUndefined();

          const sessionId = await apiServices.discover.create(
            {
              title: `${sessionName} round trip`,
              tabs: [
                {
                  id: 'tab-1',
                  label: 'Time filter',
                  data_source: { type: 'esql', query: TIME_FILTER_QUERY },
                  time_range: TIME_FILTER_RANGE,
                  breakdown_field: 'service',
                  vis_context: { suggestion_type: 'histogramForESQL', attributes },
                },
              ],
            },
            scoutSpace.id
          );
          const storedSession = await kbnClient.savedObjects.get<DiscoverSessionAttributes>({
            type: 'search',
            id: sessionId,
            space: scoutSpace.id,
          });
          const { visContext } = storedSession.attributes.tabs[0].attributes;
          if (!visContext || !('requestData' in visContext)) {
            throw new Error('Expected the round-tripped chart fingerprint');
          }
          const { requestData } = visContext;
          expect(requestData).toMatchObject({ breakdownField: 'service' });
          expect(requestData.timeField).toBeUndefined();

          await discover.goto({ queryMode: 'esql', savedSearchId: sessionId });
          await discover.waitUntilTabIsLoaded();
          await expect
            .poll(() => discover.getHistogramLegendLabels())
            .toStrictEqual(['early', 'late']);
          await expect.poll(getRequestData).toStrictEqual(requestData);

          // Equal-duration windows keep the generated histogram query unchanged.
          await datePicker.setAbsoluteRange({
            from: 'Sep 20, 2015 @ 10:30:00.000',
            to: 'Sep 20, 2015 @ 11:30:00.000',
          });
          await expect.poll(() => discover.getHistogramLegendLabels()).toStrictEqual(['late']);
          await expect.poll(getRequestData).toStrictEqual(requestData);
          expect(await discover.getVisualizationTitle()).toBe('Line');
        }
      );
    });

    spaceTest(
      'preserves a saved Line histogram through a session API round trip',
      async ({ config, page, pageObjects, scoutSpace, kbnClient }) => {
        const { discover } = pageObjects;
        const sessionName = `ESQL Line API round trip ${scoutSpace.id}`;

        await spaceTest.step('save a customized chart and verify a normal reload', async () => {
          await discover.writeAndSubmitEsqlQuery(ESQL_QUERY);
          await discover.changeVisualizationShape('Line');
          // The chart may still be loading here; wait on it without reopening the flyout.
          await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');

          await discover.saveSearch(sessionName);
          await page.reload();
          await discover.waitUntilTabIsLoaded();
          await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');
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
          await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');
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
          await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');
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
          await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');
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
          await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');
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
          await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');
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
          await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');
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
          await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');
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
          await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');
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
          await expect(discover.getHistogramChart()).toHaveAttribute('data-series-type', 'line');
          expect(await discover.getEsqlQueryValue()).toBe(BREAKDOWN_QUERY);
        });
      }
    );
  }
);
