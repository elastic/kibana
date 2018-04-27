/* eslint max-len: 0 */

export const savedObjects = [
  {
    id: '867e6f50-4732-11e8-b18a-af13b768203e',
    type: 'visualization',
    updated_at: '2018-04-23T20:11:36.517Z',
    version: 1,
    attributes: {
      title: 'date histogram',
      visState: '{\"title\":\"date histogram\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{\"index\":\"7043ab60-4732-11e8-b18a-af13b768203e\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}'
      }
    }
  },
  {
    id: '7043ab60-4732-11e8-b18a-af13b768203e',
    type: 'index-pattern',
    updated_at: '2018-04-23T20:11:02.488Z',
    version: 2,
    attributes: {
      title: 'kibana_sample_data_flights',
      timeFieldName: 'timestamp',
      fields: '[{\"name\":\"_id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_index\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_score\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_source\",\"type\":\"_source\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"airline\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"dest\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"origin\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"tailNum\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"timestamp\",\"type\":\"date\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true}]'
    }
  },
  {
    id: '8fc6d6b0-4732-11e8-b18a-af13b768203e',
    type: 'dashboard',
    updated_at: '2018-04-23T20:11:52.091Z',
    version: 1,
    attributes: {
      title: 'flights dashboard',
      hits: 0,
      description: '',
      panelsJSON: '[{\"gridData\":{\"w\":24,\"h\":15,\"x\":0,\"y\":0,\"i\":\"1\"},\"version\":\"7.0.0-alpha1\",\"panelIndex\":\"1\",\"type\":\"visualization\",\"id\":\"867e6f50-4732-11e8-b18a-af13b768203e\",\"embeddableConfig\":{}}]',
      optionsJSON: '{\"darkTheme\":false,\"useMargins\":true,\"hidePanelTitles\":false}',
      version: 1,
      timeRestore: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[],\"highlightAll\":true,\"version\":true}'
      }
    }
  }
];
